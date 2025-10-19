import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const College = sequelize.define('College', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 255]
    }
  },
  code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [2, 20],
      isUppercase: true
    }
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  website: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  logo_url: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'logo_url'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'colleges',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  
  hooks: {
    beforeSave: (college) => {
      if (college.code) {
        college.code = college.code.toUpperCase();
      }
    }
  }
});

// Instance methods
College.prototype.getFullAddress = function() {
  const parts = [this.address, this.city, this.state, this.country].filter(Boolean);
  return parts.join(', ');
};

College.prototype.toSafeJSON = function() {
  return this.toJSON();
};

// Class methods
College.findByCode = function(code) {
  return this.findOne({
    where: { 
      code: code.toUpperCase(),
      is_active: true 
    }
  });
};

College.findActiveColleges = function() {
  return this.findAll({
    where: { is_active: true },
    order: [['name', 'ASC']]
  });
};

// Scopes
College.addScope('active', {
  where: { is_active: true }
});

College.addScope('withStats', {
  include: [
    {
      association: 'users',
      attributes: [],
      separate: false
    },
    {
      association: 'books',
      attributes: [],
      separate: false
    }
  ],
  attributes: {
    include: [
      [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('users.id'))), 'user_count'],
      [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('books.id'))), 'book_count']
    ]
  },
  group: ['College.id']
});

export default College;