import express from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { Op } from 'sequelize';
import { Order, SubscriptionPlan, UserSubscription, User, sequelize } from '../models/index.js';
import { requireRoles } from '../middleware/rbac.js';

const router = express.Router();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mEyPw0QDcihZ7V',
  key_secret: process.env.RAZORPAY_KEY_SECRET || ''
});

// Create order (Step 1 - Create Razorpay order)
router.post('/create', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { plan_id, notes } = req.body;
    const userId = req.user.userId;

    // Validate plan
    const plan = await SubscriptionPlan.findByPk(plan_id);
    if (!plan || !plan.is_active) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found or inactive',
        error: 'PLAN_NOT_FOUND'
      });
    }

    // Check for existing active subscription
    const existingActiveSubscription = await UserSubscription.findOne({
      where: {
        user_id: userId,
        status: 'active',
        end_date: { [Op.gte]: new Date() }
      }
    });

    if (existingActiveSubscription) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'User already has an active subscription',
        error: 'ACTIVE_SUBSCRIPTION_EXISTS'
      });
    }

    // Get user details for receipt
    const user = await User.findByPk(userId);
    
    // Convert price to paise (Razorpay uses smallest currency unit)
    const amountInPaise = Math.round(parseFloat(plan.price) * 100);

    // Generate unique receipt
    const receipt = `rcpt_${Date.now()}_${userId.substring(0, 8)}`;

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: receipt,
      notes: {
        plan_id: plan_id,
        plan_name: plan.name,
        user_id: userId,
        user_email: user.email,
        ...notes
      }
    });

    // Create order in database
    const order = await Order.create({
      user_id: userId,
      plan_id: plan_id,
      razorpay_order_id: razorpayOrder.id,
      amount: plan.price,
      currency: 'INR',
      status: 'created',
      receipt: receipt,
      notes: {
        plan_name: plan.name,
        ...notes
      }
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order_id: order.id,
        razorpay_order_id: razorpayOrder.id,
        amount: plan.price,
        amount_in_paise: amountInPaise,
        currency: 'INR',
        razorpay_key: process.env.RAZORPAY_KEY_ID || 'rzp_test_mEyPw0QDcihZ7V',
        plan: {
          id: plan.id,
          name: plan.name,
          description: plan.description,
          duration_months: plan.duration_months
        }
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: 'ORDER_CREATE_FAILED',
      details: error.message
    });
  }
});

// Verify payment (Step 2 - Verify Razorpay payment signature)
router.post('/verify-payment', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    const userId = req.user.userId;

    // Find order
    const order = await Order.findOne({
      where: {
        razorpay_order_id: razorpay_order_id,
        user_id: userId
      },
      include: ['plan']
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        error: 'ORDER_NOT_FOUND'
      });
    }

    if (order.status === 'paid') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Order is already paid',
        error: 'ORDER_ALREADY_PAID'
      });
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      // Update order as failed
      await order.update({
        status: 'failed',
        failed_at: new Date(),
        failure_reason: 'Invalid payment signature'
      }, { transaction });

      await transaction.commit();

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
        error: 'INVALID_SIGNATURE'
      });
    }

    // Fetch payment details from Razorpay
    let paymentDetails = {};
    try {
      const payment = await razorpay.payments.fetch(razorpay_payment_id);
      paymentDetails = {
        method: payment.method,
        email: payment.email,
        contact: payment.contact,
        bank: payment.bank,
        wallet: payment.wallet,
        vpa: payment.vpa,
        card_id: payment.card_id
      };
    } catch (paymentError) {
      console.error('Error fetching payment details:', paymentError);
    }

    // Update order
    await order.update({
      razorpay_payment_id: razorpay_payment_id,
      razorpay_signature: razorpay_signature,
      status: 'paid',
      paid_at: new Date(),
      payment_method: paymentDetails.method || 'unknown',
      payment_details: paymentDetails
    }, { transaction });

    // Create subscription
    const plan = order.plan;
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + plan.duration_months);

    const subscription = await UserSubscription.create({
      user_id: userId,
      plan_id: order.plan_id,
      start_date: startDate,
      end_date: endDate,
      status: 'active',
      payment_method: paymentDetails.method || 'razorpay',
      payment_reference: razorpay_payment_id,
      amount_paid: order.amount
    }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Payment verified and subscription activated successfully',
      data: {
        order: {
          id: order.id,
          status: order.status,
          paid_at: order.paid_at
        },
        subscription: {
          id: subscription.id,
          start_date: subscription.start_date,
          end_date: subscription.end_date,
          status: subscription.status
        }
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: 'PAYMENT_VERIFICATION_FAILED',
      details: error.message
    });
  }
});

// Handle payment failure
router.post('/payment-failed', async (req, res) => {
  try {
    const { razorpay_order_id, error } = req.body;
    const userId = req.user.userId;

    const order = await Order.findOne({
      where: {
        razorpay_order_id: razorpay_order_id,
        user_id: userId
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        error: 'ORDER_NOT_FOUND'
      });
    }

    await order.update({
      status: 'failed',
      failed_at: new Date(),
      failure_reason: JSON.stringify(error)
    });

    res.json({
      success: true,
      message: 'Payment failure recorded',
      data: { order }
    });
  } catch (error) {
    console.error('Payment failed error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record payment failure',
      error: 'PAYMENT_FAILURE_RECORD_FAILED'
    });
  }
});

// Get user's orders
router.get('/my-orders', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { user_id: userId };
    if (status) whereClause.status = status;

    const orders = await Order.findAndCountAll({
      where: whereClause,
      include: ['plan', 'user'],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        orders: orders.rows,
        pagination: {
          total: orders.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(orders.count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get orders',
      error: 'ORDERS_FETCH_FAILED'
    });
  }
});

// Get order by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const whereClause = { id };
    if (userRole !== 'admin') {
      whereClause.user_id = userId;
    }

    const order = await Order.findOne({
      where: whereClause,
      include: ['plan', 'user']
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        error: 'ORDER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: { order }
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get order',
      error: 'ORDER_FETCH_FAILED'
    });
  }
});

// Get all orders (admin only)
router.get('/', requireRoles(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, userId, planId, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (status) whereClause.status = status;
    if (userId) whereClause.user_id = userId;
    if (planId) whereClause.plan_id = planId;
    
    if (startDate || endDate) {
      whereClause.created_at = {};
      if (startDate) whereClause.created_at[Op.gte] = new Date(startDate);
      if (endDate) whereClause.created_at[Op.lte] = new Date(endDate);
    }

    const orders = await Order.findAndCountAll({
      where: whereClause,
      include: ['user', 'plan'],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        orders: orders.rows,
        pagination: {
          total: orders.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(orders.count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get orders',
      error: 'ORDERS_FETCH_FAILED'
    });
  }
});

// Get order statistics (admin only)
router.get('/stats/overview', requireRoles(['admin']), async (req, res) => {
  try {
    const stats = {
      totalOrders: await Order.count(),
      paidOrders: await Order.count({ where: { status: 'paid' } }),
      failedOrders: await Order.count({ where: { status: 'failed' } }),
      pendingOrders: await Order.count({ where: { status: ['created', 'pending'] } })
    };

    // Revenue statistics
    const totalRevenue = await Order.sum('amount', {
      where: { status: 'paid' }
    });

    const todayRevenue = await Order.sum('amount', {
      where: {
        status: 'paid',
        paid_at: {
          [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    });

    const monthlyRevenue = await Order.sum('amount', {
      where: {
        status: 'paid',
        paid_at: {
          [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    });

    // Recent successful orders
    const recentOrders = await Order.findAll({
      where: { status: 'paid' },
      include: ['user', 'plan'],
      order: [['paid_at', 'DESC']],
      limit: 5
    });

    // Payment method breakdown
    const paymentMethods = await Order.findAll({
      where: { status: 'paid' },
      attributes: [
        'payment_method',
        [sequelize.fn('COUNT', sequelize.col('Order.id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount']
      ],
      group: ['payment_method']
    });

    res.json({
      success: true,
      data: {
        stats,
        revenue: {
          total: totalRevenue || 0,
          today: todayRevenue || 0,
          monthly: monthlyRevenue || 0
        },
        recentOrders,
        paymentMethods
      }
    });
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get order statistics',
      error: 'ORDER_STATS_FETCH_FAILED'
    });
  }
});

// Refund order (admin only)
router.post('/:id/refund', requireRoles(['admin']), async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { amount, notes } = req.body;

    const order = await Order.findByPk(id, {
      include: ['user', 'plan']
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        error: 'ORDER_NOT_FOUND'
      });
    }

    if (order.status !== 'paid') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Only paid orders can be refunded',
        error: 'INVALID_ORDER_STATUS'
      });
    }

    if (!order.razorpay_payment_id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'No payment ID found for this order',
        error: 'NO_PAYMENT_ID'
      });
    }

    // Create refund in Razorpay
    const refundAmount = amount ? Math.round(parseFloat(amount) * 100) : undefined;
    const refund = await razorpay.payments.refund(order.razorpay_payment_id, {
      amount: refundAmount,
      notes: notes || {}
    });

    // Update order
    await order.update({
      status: 'refunded',
      payment_details: {
        ...order.payment_details,
        refund: {
          id: refund.id,
          amount: refund.amount / 100,
          created_at: new Date()
        }
      }
    }, { transaction });

    // Cancel associated subscription if exists
    const subscription = await UserSubscription.findOne({
      where: {
        user_id: order.user_id,
        payment_reference: order.razorpay_payment_id
      }
    });

    if (subscription) {
      await subscription.update({
        status: 'cancelled',
        cancelled_at: new Date()
      }, { transaction });
    }

    await transaction.commit();

    res.json({
      success: true,
      message: 'Order refunded successfully',
      data: {
        order,
        refund: {
          id: refund.id,
          amount: refund.amount / 100,
          status: refund.status
        }
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Refund order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refund order',
      error: 'ORDER_REFUND_FAILED',
      details: error.message
    });
  }
});

// Webhook endpoint for Razorpay (optional - for automated payment updates)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body = req.body;

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || '')
      .update(JSON.stringify(body))
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature'
      });
    }

    const event = body.event;
    const payload = body.payload.payment.entity;

    if (event === 'payment.captured') {
      // Handle successful payment
      const order = await Order.findOne({
        where: { razorpay_order_id: payload.order_id }
      });

      if (order && order.status !== 'paid') {
        await order.update({
          razorpay_payment_id: payload.id,
          status: 'paid',
          paid_at: new Date(),
          payment_method: payload.method,
          payment_details: payload
        });
      }
    } else if (event === 'payment.failed') {
      // Handle failed payment
      const order = await Order.findOne({
        where: { razorpay_order_id: payload.order_id }
      });

      if (order) {
        await order.update({
          status: 'failed',
          failed_at: new Date(),
          failure_reason: payload.error_description
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed'
    });
  }
});

export default router;