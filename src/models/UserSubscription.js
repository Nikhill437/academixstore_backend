import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const UserSubscription = sequelize.define('UserSubscription', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id'
  },
  plan_id: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'plan_id'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'expired', 'cancelled'),
    defaultValue: 'active'
  },
  start_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'start_date'
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'end_date'
  },
  payment_reference: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'payment_reference'
  },
  auto_renewal: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'auto_renewal'
  }
}, {
  tableName: 'user_subscriptions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

export default UserSubscription;