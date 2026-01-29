import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const QuestionPaperAccessLog = sequelize.define('QuestionPaperAccessLog', {
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
  question_paper_id: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'question_paper_id'
  },
  access_type: {
    type: DataTypes.STRING(20),
    defaultValue: 'view',
    field: 'access_type',
    validate: {
      isIn: [['view', 'download']]
    }
  },
  accessed_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'accessed_at'
  },
  ip_address: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'ip_address'
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent'
  }
}, {
  tableName: 'question_paper_access_logs',
  timestamps: false, // This table uses accessed_at instead of created_at/updated_at
  underscored: true
});

export default QuestionPaperAccessLog;
