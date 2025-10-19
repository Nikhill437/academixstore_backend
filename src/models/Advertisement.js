import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Advertisement = sequelize.define('Advertisement', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 255]
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  image_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'image_url'
  },
  link_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'link_url'
  },
  college_id: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'college_id'
  },
  target_roles: {
    type: DataTypes.ARRAY(DataTypes.ENUM('super_admin', 'admin', 'student', 'user')),
    allowNull: true,
    field: 'target_roles'
  },
  target_years: {
    type: DataTypes.ARRAY(DataTypes.ENUM('first_year', 'second_year', 'third_year', 'fourth_year', 'graduate')),
    allowNull: true,
    field: 'target_years'
  },
  position: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'banner'
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0
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
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  click_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'click_count'
  },
  impression_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'impression_count'
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'created_by'
  }
}, {
  tableName: 'advertisements',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

export default Advertisement;