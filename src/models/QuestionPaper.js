import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const QuestionPaper = sequelize.define('QuestionPaper', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 500]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  subject: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 4
    }
  },
  semester: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 8
    }
  },
  exam_type: {
    type: DataTypes.ENUM('midterm', 'final', 'quiz', 'practice'),
    allowNull: true,
    field: 'exam_type'
  },
  marks: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  pdf_url: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'pdf_url'
  },
  college_id: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'college_id'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'created_by'
  }
}, {
  tableName: 'question_papers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

// Instance methods

/**
 * Check if a user has access to this question paper
 * @param {Object} user - User object with role, collegeId, and year properties
 * @returns {boolean} - True if user has access, false otherwise
 */
QuestionPaper.prototype.isAccessibleBy = function (user) {
  // Super admin → full access
  if (user.role === 'super_admin') return true;

  // Global question papers (no college_id) → everyone
  if (!this.college_id) return true;

  // College-based question papers
  if (this.college_id) {
    if (!user.collegeId) return false;
    
    // Compare college IDs
    // user.collegeId contains the college code (STRING)
    // this.college_id contains the college UUID
    // We need to compare using the college relationship if available
    const questionPaperCollegeCode = this.college?.code || this.college_id;
    
    // If college relationship is loaded, compare codes
    // Otherwise, compare IDs directly (fallback for backward compatibility)
    const userCollegeId = user.collegeId;
    
    if (questionPaperCollegeCode !== userCollegeId) return false;

    // College admin has access to all question papers in their college
    if (user.role === 'college_admin') {
      return true;
    }

    // User role has access to all question papers in any college
    if (user.role === 'user') {
      return true;
    }

    // Student must have matching year
    if (user.role === 'student') {
      // Student must have a year field defined
      if (!user.year) return false;
      
      // Question paper year must match student's year
      if (user.year !== this.year) return false;
      
      return true;
    }
  }

  return false;
};

/**
 * Convert question paper to safe JSON (removes sensitive data)
 * @returns {Object} - Safe JSON representation
 */
QuestionPaper.prototype.toSafeJSON = function() {
  const questionPaper = this.toJSON();
  return questionPaper;
};

// Class methods

/**
 * Find question papers by college
 * @param {string} collegeId - College UUID
 * @returns {Promise<Array>} - Array of question papers
 */
QuestionPaper.findByCollege = function(collegeId) {
  return this.findAll({
    where: {
      college_id: collegeId,
      is_active: true
    },
    order: [['year', 'ASC'], ['semester', 'ASC'], ['title', 'ASC']]
  });
};

/**
 * Find question papers by year
 * @param {number} year - Academic year (1-4)
 * @returns {Promise<Array>} - Array of question papers
 */
QuestionPaper.findByYear = function(year) {
  return this.findAll({
    where: {
      year: year,
      is_active: true
    },
    order: [['semester', 'ASC'], ['title', 'ASC']]
  });
};

/**
 * Find question papers by subject
 * @param {string} subject - Subject name
 * @returns {Promise<Array>} - Array of question papers
 */
QuestionPaper.findBySubject = function(subject) {
  return this.findAll({
    where: {
      subject: subject,
      is_active: true
    },
    order: [['year', 'ASC'], ['semester', 'ASC'], ['title', 'ASC']]
  });
};

/**
 * Find question papers by college and year
 * @param {string} collegeId - College UUID
 * @param {number} year - Academic year (1-4)
 * @param {number} semester - Semester (optional)
 * @returns {Promise<Array>} - Array of question papers
 */
QuestionPaper.findByCollegeAndYear = function(collegeId, year, semester = null) {
  const whereCondition = {
    college_id: collegeId,
    year: year,
    is_active: true
  };
  
  if (semester) whereCondition.semester = semester;
  
  return this.findAll({
    where: whereCondition,
    order: [['semester', 'ASC'], ['title', 'ASC']]
  });
};

// Scopes

QuestionPaper.addScope('active', {
  where: { is_active: true }
});

QuestionPaper.addScope('forCollege', (collegeId) => ({
  where: { college_id: collegeId }
}));

QuestionPaper.addScope('forYear', (year) => ({
  where: { year: year }
}));

QuestionPaper.addScope('forSemester', (semester) => ({
  where: { semester: semester }
}));

QuestionPaper.addScope('byYearSemester', (year, semester) => ({
  where: { year: year, semester: semester }
}));

QuestionPaper.addScope('bySubject', (subject) => ({
  where: { subject: subject }
}));

QuestionPaper.addScope('byExamType', (examType) => ({
  where: { exam_type: examType }
}));

QuestionPaper.addScope('withCreator', {
  include: [
    {
      association: 'creator',
      attributes: ['id', 'username', 'first_name', 'last_name']
    }
  ]
});

export default QuestionPaper;
