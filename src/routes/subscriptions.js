import express from 'express';
import { Op } from 'sequelize';
import { SubscriptionPlan, UserSubscription, User, sequelize } from '../models/index.js';
import { requireRoles } from '../middleware/rbac.js';

const router = express.Router();

// Get all subscription plans (public)
router.get('/plans', async (req, res) => {
  try {
    const plans = await SubscriptionPlan.findAll({
      where: { is_active: true },
      order: [['price', 'ASC']]
    });

    res.json({
      success: true,
      data: { plans }
    });
  } catch (error) {
    console.error('Get subscription plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscription plans',
      error: 'PLANS_FETCH_FAILED'
    });
  }
});

// Create subscription plan (admin only)
router.post('/plans', requireRoles(['admin']), async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      duration_days,
      features,
      max_downloads_per_day,
      is_active = true
    } = req.body;

    const plan = await SubscriptionPlan.create({
      name,
      description,
      price,
      duration_days,
      features,
      max_downloads_per_day,
      is_active,
      created_by: req.user.userId
    });

    res.status(201).json({
      success: true,
      message: 'Subscription plan created successfully',
      data: { plan }
    });
  } catch (error) {
    console.error('Create subscription plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create subscription plan',
      error: 'PLAN_CREATE_FAILED'
    });
  }
});

// Update subscription plan (admin only)
router.put('/plans/:id', requireRoles(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await SubscriptionPlan.findByPk(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found',
        error: 'PLAN_NOT_FOUND'
      });
    }

    const {
      name,
      description,
      price,
      duration_days,
      features,
      max_downloads_per_day,
      is_active
    } = req.body;

    await plan.update({
      name: name || plan.name,
      description: description || plan.description,
      price: price || plan.price,
      duration_days: duration_days || plan.duration_days,
      features: features || plan.features,
      max_downloads_per_day: max_downloads_per_day || plan.max_downloads_per_day,
      is_active: is_active !== undefined ? is_active : plan.is_active
    });

    res.json({
      success: true,
      message: 'Subscription plan updated successfully',
      data: { plan }
    });
  } catch (error) {
    console.error('Update subscription plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update subscription plan',
      error: 'PLAN_UPDATE_FAILED'
    });
  }
});

// Create user subscription
router.post('/', async (req, res) => {
  try {
    const { plan_id, payment_method, payment_reference } = req.body;
    const userId = req.user.userId;

    // Get the subscription plan
    const plan = await SubscriptionPlan.findByPk(plan_id);
    if (!plan || !plan.is_active) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found or inactive',
        error: 'PLAN_NOT_FOUND'
      });
    }

    // Check if user already has an active subscription
    const existingActiveSubscription = await UserSubscription.findOne({
      where: {
        user_id: userId,
        status: 'active',
        end_date: { [Op.gte]: new Date() }
      }
    });

    if (existingActiveSubscription) {
      return res.status(400).json({
        success: false,
        message: 'User already has an active subscription',
        error: 'ACTIVE_SUBSCRIPTION_EXISTS'
      });
    }

    // Calculate end date
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.duration_days);

    const subscription = await UserSubscription.create({
      user_id: userId,
      plan_id: plan_id,
      start_date: startDate,
      end_date: endDate,
      status: 'active', // In a real app, this would be 'pending' until payment confirmation
      payment_method,
      payment_reference,
      amount_paid: plan.price
    });

    const subscriptionWithPlan = await UserSubscription.findByPk(subscription.id, {
      include: ['plan', 'user']
    });

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      data: { subscription: subscriptionWithPlan }
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create subscription',
      error: 'SUBSCRIPTION_CREATE_FAILED'
    });
  }
});

// Get user's subscriptions
router.get('/my-subscriptions', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { user_id: userId };
    if (status) whereClause.status = status;

    const subscriptions = await UserSubscription.findAndCountAll({
      where: whereClause,
      include: ['plan'],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        subscriptions: subscriptions.rows,
        pagination: {
          total: subscriptions.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(subscriptions.count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscriptions',
      error: 'SUBSCRIPTIONS_FETCH_FAILED'
    });
  }
});

// Get current active subscription
router.get('/current', async (req, res) => {
  try {
    const userId = req.user.userId;

    const activeSubscription = await UserSubscription.findOne({
      where: {
        user_id: userId,
        status: 'active',
        end_date: { [Op.gte]: new Date() }
      },
      include: ['plan'],
      order: [['end_date', 'DESC']]
    });

    res.json({
      success: true,
      data: { subscription: activeSubscription }
    });
  } catch (error) {
    console.error('Get current subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get current subscription',
      error: 'CURRENT_SUBSCRIPTION_FETCH_FAILED'
    });
  }
});

// Cancel subscription
router.put('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const subscription = await UserSubscription.findByPk(id, {
      include: ['user', 'plan']
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
        error: 'SUBSCRIPTION_NOT_FOUND'
      });
    }

    // Users can only cancel their own subscriptions, admins can cancel any
    if (userRole !== 'admin' && subscription.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        error: 'ACCESS_DENIED'
      });
    }

    if (subscription.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Subscription is already cancelled',
        error: 'ALREADY_CANCELLED'
      });
    }

    await subscription.update({
      status: 'cancelled',
      cancelled_at: new Date()
    });

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: { subscription }
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription',
      error: 'SUBSCRIPTION_CANCEL_FAILED'
    });
  }
});

// Get all subscriptions (admin only)
router.get('/', requireRoles(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, userId, planId } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (status) whereClause.status = status;
    if (userId) whereClause.user_id = userId;
    if (planId) whereClause.plan_id = planId;

    const subscriptions = await UserSubscription.findAndCountAll({
      where: whereClause,
      include: ['user', 'plan'],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        subscriptions: subscriptions.rows,
        pagination: {
          total: subscriptions.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(subscriptions.count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscriptions',
      error: 'SUBSCRIPTIONS_FETCH_FAILED'
    });
  }
});

// Get subscription statistics (admin only)
router.get('/stats', requireRoles(['admin']), async (req, res) => {
  try {
    const stats = {
      totalSubscriptions: await UserSubscription.count(),
      activeSubscriptions: await UserSubscription.count({
        where: {
          status: 'active',
          end_date: { [Op.gte]: new Date() }
        }
      }),
      expiredSubscriptions: await UserSubscription.count({
        where: {
          status: 'active',
          end_date: { [Op.lt]: new Date() }
        }
      }),
      cancelledSubscriptions: await UserSubscription.count({
        where: { status: 'cancelled' }
      })
    };

    // Revenue statistics
    const totalRevenue = await UserSubscription.sum('amount_paid', {
      where: { status: ['active', 'completed'] }
    });

    const monthlyRevenue = await UserSubscription.sum('amount_paid', {
      where: {
        status: ['active', 'completed'],
        created_at: {
          [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    });

    // Popular plans
    const popularPlans = await UserSubscription.findAll({
      include: [{
        model: SubscriptionPlan,
        as: 'plan',
        attributes: ['name', 'price']
      }],
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('UserSubscription.id')), 'subscription_count']
      ],
      group: ['plan.id', 'plan.name', 'plan.price'],
      order: [[sequelize.fn('COUNT', sequelize.col('UserSubscription.id')), 'DESC']],
      limit: 5
    });

    res.json({
      success: true,
      data: {
        stats,
        revenue: {
          total: totalRevenue || 0,
          monthly: monthlyRevenue || 0
        },
        popularPlans
      }
    });
  } catch (error) {
    console.error('Get subscription stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscription statistics',
      error: 'SUBSCRIPTION_STATS_FETCH_FAILED'
    });
  }
});

export default router;