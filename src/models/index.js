import sequelize from '../config/database.js';
import { Order, User, Book, sequelize } from '../models/index.js';

// Import all models
import User from './User.js';
import College from './College.js';
import Book from './Book.js';
import SubscriptionPlan from './SubscriptionPlan.js';
import UserSubscription from './UserSubscription.js';
import Advertisement from './Advertisement.js';
import BookAccessLog from './BookAccessLog.js';
import UserSession from './UserSession.js';
import SystemSettings from './SystemSettings.js';
import Order from './Order.js';
// Define associations
const setupAssociations = () => {
  // User - College associations
  User.belongsTo(College, {
  foreignKey: 'college_id', // column in users table
  targetKey: 'code',        // column in colleges table
  as: 'college'
  });
  College.hasMany(User, {
    foreignKey: 'college_id',
    as: 'users'
  });

  // Book - College associations
  Book.belongsTo(College, {
    foreignKey: 'college_id',
    as: 'college'
  });
  College.hasMany(Book, {
    foreignKey: 'college_id',
    as: 'books'
  });

  // Book - User (creator) associations
  Book.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator'
  });
  User.hasMany(Book, {
    foreignKey: 'created_by',
    as: 'created_books'
  });

  // User - UserSubscription associations
  User.hasMany(UserSubscription, {
    foreignKey: 'user_id',
    as: 'subscriptions'
  });
  UserSubscription.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });

  // SubscriptionPlan - UserSubscription associations
  SubscriptionPlan.hasMany(UserSubscription, {
    foreignKey: 'plan_id',
    as: 'user_subscriptions'
  });
  UserSubscription.belongsTo(SubscriptionPlan, {
    foreignKey: 'plan_id',
    as: 'plan'
  });

  // Advertisement - College associations
  Advertisement.belongsTo(College, {
    foreignKey: 'college_id',
    as: 'college'
  });
  College.hasMany(Advertisement, {
    foreignKey: 'college_id',
    as: 'advertisements'
  });

  // Advertisement - User (creator) associations
  Advertisement.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator'
  });
  User.hasMany(Advertisement, {
    foreignKey: 'created_by',
    as: 'created_advertisements'
  });

  // BookAccessLog associations
  BookAccessLog.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });
  BookAccessLog.belongsTo(Book, {
    foreignKey: 'book_id',
    as: 'book'
  });
  
  User.hasMany(BookAccessLog, {
    foreignKey: 'user_id',
    as: 'book_access_logs'
  });
  Book.hasMany(BookAccessLog, {
    foreignKey: 'book_id',
    as: 'access_logs'
  });

  // UserSession associations
  UserSession.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });
  User.hasMany(UserSession, {
    foreignKey: 'user_id',
    as: 'sessions'
  });

  Order.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
  });

  Order.belongsTo(Book, {
    foreignKey: 'book_id',
    as: 'book'
  });

  User.hasMany(Order, {
    foreignKey: 'user_id',
    as: 'orders'
  });

  Book.hasMany(Order, {
    foreignKey: 'book_id',
    as: 'orders'
  });


  // SystemSettings - User (updater) associations
  SystemSettings.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'updater'
  });
  User.hasMany(SystemSettings, {
    foreignKey: 'updated_by',
    as: 'updated_settings'
  });
};

// Initialize associations
setupAssociations();

// Database connection test
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
};

// Sync models with database
const syncModels = async (options = {}) => {
  try {
    await sequelize.sync(options);
    console.log('Database models synchronized successfully.');
  } catch (error) {
    console.error('Error synchronizing models:', error);
    throw error;
  }
};

// Export models and utilities
export {
  sequelize,
  User,
  College,
  Book,
  SubscriptionPlan,
  UserSubscription,
  Advertisement,
  BookAccessLog,
  UserSession,
  SystemSettings,
  Order,
  testConnection,
  syncModels
};

// Default export for convenience
export default {
  sequelize,
  User,
  College,
  Book,
  SubscriptionPlan,
  UserSubscription,
  Advertisement,
  BookAccessLog,
  UserSession,
  SystemSettings,
  Order,
  testConnection,
  syncModels
};
