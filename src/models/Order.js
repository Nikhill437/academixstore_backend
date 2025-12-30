import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  book_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'books',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  },
  razorpay_order_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: 'razorpay_order_id'
  },
  razorpay_payment_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'razorpay_payment_id'
  },
  razorpay_signature: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'razorpay_signature'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'INR'
  },
  status: {
    type: DataTypes.ENUM('created', 'pending', 'paid', 'failed', 'refunded'),
    allowNull: false,
    defaultValue: 'created'
  },
  payment_method: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'payment_method'
  },
  payment_details: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    field: 'payment_details'
  },
  notes: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  receipt: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  paid_at: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'paid_at'
  },
  failed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'failed_at'
  },
  failure_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'failure_reason'
  }
}, {
  tableName: 'orders',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['plan_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['razorpay_order_id'],
      unique: true
    },
    {
      fields: ['created_at']
    }
  ]
});

export default Order;