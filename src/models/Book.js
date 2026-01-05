import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Book = sequelize.define('Book', {
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
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  authorname: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'authorname'
  },
  isbn: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  publisher: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  publication_year: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'publication_year',
    validate: {
      min: 1000,
      max: new Date().getFullYear() + 5
    }
  },
  language: {
    type: DataTypes.STRING(50),
    defaultValue: 'English'
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  subject: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  rate: {
  type: DataTypes.INTEGER,
  defaultValue: 0,
  validate: {
    min: 0
  }
  },
  rating: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  year: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      min: 2020,
      max: 2030
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
  pages: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  // File storage
  pdf_url: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'pdf_url'
  },
  cover_image_url: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'cover_image_url'
  },
  // Access control
  college_id: {
    type: DataTypes.UUID,
    allowNull: true, // Allow null for books not associated with any college
    field: 'college_id'
  },
  download_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'download_count'
  },
  // Metadata
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
  tableName: 'books',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  
  validate: {
    // College books must have year and semester
    collegeBookConstraint() {
      if (this.college_id && (!this.year || !this.semester)) {
        throw new Error('College books must specify year and semester');
      }
    }
  }
});

// Instance methods

Book.prototype.isAccessibleBy = function (user) {
  // Super admin → full access
  if (user.role === 'super_admin') return true;

  // Global books → everyone
  if (!this.college_id) return true;

  // College-based books
  if (this.college_id) {
    if (!user.collegeId) return false;
    
    // Compare college codes
    // user.collegeId contains the college code (STRING)
    // this.college_id contains the college UUID
    // We need to compare using the college relationship if available
    const bookCollegeCode = this.college?.code || this.college_id;
    
    // If college relationship is loaded, compare codes
    // Otherwise, compare IDs directly (fallback for backward compatibility)
    const userCollegeId = user.collegeId;
    
    if (bookCollegeCode !== userCollegeId) return false;

    // College admin has access to all books in their college
    if (user.role === 'college_admin') {
      return true;
    }

    // User role has access to all books in any college
    if (user.role === 'user') {
      return true;
    }

    // Student must have matching year
    if (user.role === 'student') {
      // Student must have a year field defined
      if (!user.year) return false;
      
      // Book year must match student's year
      if (user.year !== this.year) return false;
      
      return true;
    }
  }

  return false;
};


Book.prototype.toSafeJSON = function() {
  const book = this.toJSON();
  return book;
};

// Class methods
Book.findByISBN = function(isbn) {
  return this.findOne({
    where: { isbn, is_active: true }
  });
};

Book.findForStudent = function(collegeId, year = null, semester = null) {
  const whereCondition = {
    college_id: collegeId,
    is_active: true
  };
  
  if (year) whereCondition.year = year;
  if (semester) whereCondition.semester = semester;
  
  return this.findAll({
    where: whereCondition,
    order: [['name', 'ASC']]
  });
};

Book.findByCollegeAndYear = function(collegeId, year = null, semester = null) {
  const whereCondition = {
    college_id: collegeId,
    is_active: true
  };
  
  if (year) whereCondition.year = year;
  if (semester) whereCondition.semester = semester;
  
  return this.findAll({
    where: whereCondition,
    order: [['year', 'ASC'], ['semester', 'ASC'], ['name', 'ASC']]
  });
};

Book.findByCollege = function(collegeId) {
  return this.findAll({
    where: {
      college_id: collegeId,
      is_active: true
    },
    order: [['year', 'ASC'], ['semester', 'ASC'], ['name', 'ASC']]
  });
};

// Scopes
Book.addScope('active', {
  where: { is_active: true }
});

Book.addScope('forCollege', (collegeId) => ({
  where: { college_id: collegeId }
}));

Book.addScope('forYear', (year) => ({
  where: { year: year }
}));

Book.addScope('forSemester', (semester) => ({
  where: { semester: semester }
}));

Book.addScope('byYearSemester', (year, semester) => ({
  where: { year: year, semester: semester }
}));

Book.addScope('byCategory', (category) => ({
  where: { category: category }
}));

Book.addScope('bySubject', (subject) => ({
  where: { subject: subject }
}));

Book.addScope('withAuthor', {
  include: [
    {
      association: 'creator',
      attributes: ['id', 'username', 'first_name', 'last_name']
    }
  ]
});

export default Book;