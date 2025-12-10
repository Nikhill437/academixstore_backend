import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Upload = sequelize.define('Upload', {
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
      len: [1, 255]
    }
  },
  original_name: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  mime_type: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  s3_key: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  s3_url: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'uploads',
  timestamps: true,
  createdAt: 'created_at',
  
});



export default Book;