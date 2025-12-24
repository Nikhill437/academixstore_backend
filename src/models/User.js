import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'password_hash'
  },
  role: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'student',
    field: 'role',
    validate: {
      isIn: [['super_admin', 'college_admin', 'student', 'user']]
    }
  },
  full_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'full_name'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_login'
  },
  // Admin/Student specific fields
  college_id: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'college_id'
  },
  student_id: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'student_id'
  },
  // User specific fields
  mobile: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'mobile'
  },
  profile_image_url: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'profile_image_url'
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_verified'
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  
  // Model validations
  validate: {
    // College admin and student must have college, user and super_admin must not
    collegeAssociationConstraint() {
      if ((this.role === 'college_admin' && !this.college_id) || 
          (this.role === 'student' && !this.college_id) || 
          (this.role === 'super_admin' && this.college_id) ||
          (this.role === 'user' && this.college_id)) {
        throw new Error('Role-college association constraint violated');
      }
    },
    
    // Student must have student ID
    studentHasStudentId() {
      if (this.role === 'student' && !this.student_id) {
        throw new Error('Student ID is required for students');
      }
    }
  },
  
  // Hooks removed - passwords are now stored in plain text
});

// Instance methods
User.prototype.comparePassword = async function(password) {
  return password === this.password_hash;
};

User.prototype.getFullName = function() {
  return this.full_name || this.email;
};

User.prototype.toSafeJSON = function() {
  const user = this.toJSON();
  delete user.password_hash;
  return user;
};

// Class methods
User.findByEmail = function(email) {
  return this.findOne({
    where: { email },
    include: ['college']
  });
};

User.findActiveByEmail = function(email) {
  return this.findOne({
    where: {
      email: email,
      is_active: true
    },
    include: ['college']
  });
};

// Scopes
User.addScope('active', {
  where: { is_active: true }
});

User.addScope('byRole', (role) => ({
  where: { role }
}));

User.addScope('byCollege', (collegeId) => ({
  where: { college_id: collegeId }
}));

User.addScope('safe', {
  attributes: { exclude: ['password_hash'] }
});

export default User;