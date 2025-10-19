import { College } from './src/models/index.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Script to get college IDs for book creation testing
 * Usage: node test-create-book.js
 */
async function getCollegeInfo() {
  try {
    console.log('📚 Available colleges for book creation:');
    
    // Get all active colleges
    const colleges = await College.findAll({
      where: { is_active: true },
      attributes: ['id', 'name', 'code', 'created_at'],
      order: [['name', 'ASC']]
    });

    if (colleges.length === 0) {
      console.log('❌ No active colleges found in the system.');
      console.log('💡 You need to create a college first before creating books.');
    } else {
      colleges.forEach((college, index) => {
        console.log(`\n${index + 1}. College Details:`);
        console.log(`   📧 Name: ${college.name}`);
        console.log(`   🏫 Code: ${college.code}`);
        console.log(`   🆔 ID: ${college.id}`);
        console.log(`   📅 Created: ${college.created_at.toISOString()}`);
      });

      console.log('\n💡 To create a book as super admin, use this JSON structure:');
      console.log(JSON.stringify({
        "name": "Introduction to Computer Science",
        "description": "A comprehensive guide to computer science fundamentals",
        "authorname": "John Doe",
        "isbn": "978-1234567890",
        "publisher": "Tech Publications",
        "publication_year": 2024,
        "category": "Computer Science",
        "subject": "Programming",
        "language": "English",
        "year": 2024,
        "semester": 1,
        "pages": 350,
        "college_id": colleges[0].id
      }, null, 2));

      console.log('\n🚀 API Endpoint: POST http://localhost:3000/api/books');
      console.log('🔑 Don\'t forget to include the Authorization header: Bearer <your_token>');
    }

  } catch (error) {
    console.error('❌ Error getting college info:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

getCollegeInfo();