import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const SystemSettings = sequelize.define('SystemSettings', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_public: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_public'
  },
  updated_by: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'updated_by'
  }
}, {
  tableName: 'system_settings',
  timestamps: true,
  createdAt: false,
  updatedAt: 'updated_at',
  underscored: true
});

// Instance methods
SystemSettings.prototype.toSafeJSON = function() {
  const setting = this.toJSON();
  // Only include public settings for non-admin users
  return setting;
};

SystemSettings.prototype.isPublic = function() {
  return this.is_public === true;
};

// Class methods
SystemSettings.findByKey = function(key) {
  return this.findOne({
    where: { key }
  });
};

SystemSettings.findPublicSettings = function() {
  return this.findAll({
    where: { is_public: true },
    attributes: ['key', 'value', 'description'],
    order: [['key', 'ASC']]
  });
};

SystemSettings.findAllSettings = function() {
  return this.findAll({
    order: [['key', 'ASC']]
  });
};

SystemSettings.updateSetting = async function(key, value, updatedBy = null) {
  const [setting, created] = await this.findOrCreate({
    where: { key },
    defaults: { key, value, updated_by: updatedBy }
  });

  if (!created) {
    await setting.update({
      value,
      updated_by: updatedBy,
      updated_at: new Date()
    });
  }

  return setting;
};

// Scopes
SystemSettings.addScope('public', {
  where: { is_public: true }
});

SystemSettings.addScope('private', {
  where: { is_public: false }
});

export default SystemSettings;