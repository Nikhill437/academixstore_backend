import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const BookAccessLog = sequelize.define('BookAccessLog', {
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
  book_id: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'book_id'
  },
  access_type: {
    type: DataTypes.STRING(20),
    defaultValue: 'view',
    field: 'access_type',
    validate: {
      isIn: [['view', 'download', 'preview']]
    }
  },
  accessed_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'accessed_at'
  },
  ip_address: {
    type: DataTypes.INET,
    allowNull: true,
    field: 'ip_address'
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent'
  }
}, {
  tableName: 'book_access_logs',
  timestamps: false,
  underscored: true
});

export default BookAccessLog;