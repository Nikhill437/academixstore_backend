import express from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { Op } from 'sequelize';
import { Order, Book, User, sequelize } from '../models/index.js';
import { requireRoles } from '../middleware/rbac.js';

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

    const amountInPaise = Math.round(book.price * 100);

    // 2️⃣ Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `book_${Date.now()}`,
      notes: {
        book_id,
        user_id: userId,
        book_title: book.title
      }
    });

    // 3️⃣ Save order in DB
    const order = await Order.create({
      user_id: userId,
      book_id: book_id,
      razorpay_order_id: razorpayOrder.id,
      amount: book.price,
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
          title: book.title
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

    await transaction.commit();

    res.json({
      success: true,
      message: 'Payment successful',
      data: { orderId: order.id }
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

export default router;
