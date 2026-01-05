import express from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { Order, Book, UserSubscription, SubscriptionPlan, sequelize } from '../models/index.js';
import { requireRoles } from '../middleware/rbac.js';
import { authenticateToken } from '../middleware/auth.js';
import { generateSignedUrl, extractS3Key } from '../config/aws.js';

const router = express.Router();

// Razorpay init
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

/**
 * CREATE ORDER (Book Purchase)
 */
router.post('/create', async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { book_id } = req.body;
    const userId = req.user.userId;

    // 1️⃣ Fetch book
    const book = await Book.findByPk(book_id);
    if (!book) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    const price = Number(book.rate);
    if (!price || isNaN(price)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid book price'
      });
    }

    const amountInPaise = Math.round(price * 100);

    // 2️⃣ Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `book_${Date.now()}`,
      payment_capture: 1 // auto-capture payment
    });

    // 3️⃣ Save order in DB
    const order = await Order.create({
      user_id: userId,
      book_id: book_id,
      razorpay_order_id: razorpayOrder.id,
      amount: price, // rupees
      currency: 'INR',
      status: 'created'
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      data: {
        razorpay_order_id: razorpayOrder.id,
        amount: amountInPaise,
        currency: 'INR',
        razorpay_key: process.env.RAZORPAY_KEY_ID,
        book: {
          id: book.id,
          title: book.name
        }
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Order creation failed'
    });
  }
});


/**
 * VERIFY PAYMENT
 */
router.post('/verify-payment', async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    const userId = req.user.userId;

    const order = await Order.findOne({
      where: { razorpay_order_id, user_id: userId }
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Signature verification
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      await order.update({
        status: 'failed',
        failure_reason: 'Invalid signature'
      }, { transaction });

      await transaction.commit();
      return res.status(400).json({ success: false, message: 'Invalid payment' });
    }

    // Success
    await order.update({
      razorpay_payment_id,
      razorpay_signature,
      status: 'paid',
      paid_at: new Date()
    }, { transaction });

    // Create 6-month subscription for the purchased book
    const currentDate = new Date();
    const subscriptionEndDate = new Date(currentDate);
    subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 6);

    // Find or create a "Book Purchase" subscription plan
    let bookPurchasePlan = await SubscriptionPlan.findOne({
      where: { name: 'Book Purchase - 6 Months' }
    });

    if (!bookPurchasePlan) {
      bookPurchasePlan = await SubscriptionPlan.create({
        name: 'Book Purchase - 6 Months',
        description: 'Individual book purchase with 6 months access',
        price: 0, // Price is already paid through the order
        duration_months: 6,
        features: JSON.stringify(['6 months access to purchased book', 'Download for offline reading']),
        is_active: true
      }, { transaction });
    }

    // Create user subscription for this book
    await UserSubscription.create({
      user_id: userId,
      plan_id: bookPurchasePlan.id,
      status: 'active',
      start_date: currentDate,
      end_date: subscriptionEndDate,
      payment_reference: razorpay_payment_id,
      auto_renewal: false
    }, { transaction });

    await transaction.commit();

    console.log(`[Order ${order.id}] Created 6-month subscription for user ${userId}, book ${order.book_id}, expires: ${subscriptionEndDate.toISOString()}`);

    res.json({
      success: true,
      message: 'Payment successful',
      data: { 
        orderId: order.id,
        subscriptionEndDate: subscriptionEndDate.toISOString()
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed'
    });
  }
});

/**
 * GET MY PURCHASED BOOKS (User role only)
 * Returns all books purchased by the authenticated user
 */
router.get('/my-purchases', 
  authenticateToken,
  requireRoles(['user']),
  async (req, res) => {
    try {
      const userId = req.user.userId;
      const { page = 1, limit = 10, status = 'paid' } = req.query;
      const offset = (page - 1) * limit;

      // Build where clause
      const whereClause = {
        user_id: userId
      };

      // Filter by status if provided
      if (status) {
        whereClause.status = status;
      }

      // Fetch orders with book details
      const orders = await Order.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Book,
            as: 'book',
            attributes: [
              'id',
              'name',
              'authorname',
              'description',
              'category',
              'subject',
              'language',
              'year',
              'semester',
              'pages',
              'rating',
              'pdf_url',
              'cover_image_url'
            ]
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['paid_at', 'DESC'], ['created_at', 'DESC']]
      });

      // Get user subscriptions to check access validity
      const userSubscriptions = await UserSubscription.findAll({
        where: {
          user_id: userId,
          status: 'active'
        },
        include: [
          {
            model: SubscriptionPlan,
            as: 'plan',
            attributes: ['name', 'duration_months']
          }
        ]
      });

      // Format response with signed URLs
      const purchases = orders.rows.map(order => {
        const orderData = order.toJSON();
        
        // Find subscription for this order
        const subscription = userSubscriptions.find(sub => 
          sub.payment_reference === orderData.razorpay_payment_id
        );

        // Check if subscription is still valid
        const now = new Date();
        const isSubscriptionActive = subscription && 
          subscription.status === 'active' && 
          new Date(subscription.end_date) > now;

        // Generate signed URL for PDF access (valid for 1 hour) only if subscription is active
        if (orderData.book && orderData.book.pdf_url && isSubscriptionActive) {
          try {
            const key = extractS3Key(orderData.book.pdf_url);
            if (key) {
              console.log(`[Order ${orderData.id}] Extracted PDF S3 key: ${key} from URL: ${orderData.book.pdf_url}`);
              orderData.book.pdf_access_url = generateSignedUrl(key, 3600);
            } else {
              console.error(`[Order ${orderData.id}] Failed to extract S3 key from PDF URL: ${orderData.book.pdf_url}`);
            }
            // Remove direct PDF URL for security
            delete orderData.book.pdf_url;
          } catch (error) {
            console.error(`[Order ${orderData.id}] Failed to generate PDF signed URL:`, error);
          }
        } else {
          // Remove PDF URL if subscription expired
          delete orderData.book.pdf_url;
        }

        // Generate signed URL for cover image (valid for 1 hour)
        if (orderData.book && orderData.book.cover_image_url) {
          try {
            const key = extractS3Key(orderData.book.cover_image_url);
            if (key) {
              console.log(`[Order ${orderData.id}] ✅ Extracted cover image S3 key: ${key} from URL: ${orderData.book.cover_image_url}`);
              orderData.book.cover_image_access_url = generateSignedUrl(key, 3600);
            } else {
              console.error(`[Order ${orderData.id}] ❌ Failed to extract S3 key from cover image URL: ${orderData.book.cover_image_url}`);
              // Fallback: use direct URL (will work if bucket policy is set)
              orderData.book.cover_image_access_url = orderData.book.cover_image_url;
            }
            // Remove direct cover image URL for security
            delete orderData.book.cover_image_url;
          } catch (error) {
            console.error(`[Order ${orderData.id}] ❌ Failed to generate cover image signed URL:`, error);
            // Fallback: use direct URL (will work if bucket policy is set)
            orderData.book.cover_image_access_url = orderData.book.cover_image_url;
            delete orderData.book.cover_image_url;
          }
        }

        return {
          id: orderData.id,
          book: orderData.book,
          amount: orderData.amount,
          currency: orderData.currency,
          status: orderData.status,
          payment_method: orderData.payment_method,
          purchased_at: orderData.paid_at || orderData.created_at,
          razorpay_order_id: orderData.razorpay_order_id,
          razorpay_payment_id: orderData.razorpay_payment_id,
          // Add subscription info
          subscription: subscription ? {
            status: subscription.status,
            start_date: subscription.start_date,
            end_date: subscription.end_date,
            is_active: isSubscriptionActive,
            days_remaining: isSubscriptionActive ? 
              Math.ceil((new Date(subscription.end_date) - now) / (1000 * 60 * 60 * 24)) : 0
          } : null
        };
      });

      res.json({
        success: true,
        data: {
          purchases,
          pagination: {
            total: orders.count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(orders.count / limit)
          }
        }
      });

    } catch (error) {
      console.error('Get purchased books error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve purchased books',
        error: 'PURCHASES_FETCH_FAILED'
      });
    }
  }
);

export default router;
