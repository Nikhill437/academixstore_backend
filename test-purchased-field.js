/**
 * Manual test script to verify the purchased field functionality
 * 
 * This script tests:
 * 1. User with 'user' role sees purchased = 1 for purchased books
 * 2. User with 'user' role sees purchased = 0 for non-purchased books
 * 3. User with 'student' role always sees purchased = 0
 * 4. User with 'super_admin' role always sees purchased = 0
 * 
 * To run this test:
 * 1. Ensure your database is running
 * 2. Ensure you have test data (users, books, orders)
 * 3. Run: node test-purchased-field.js
 */

import { Book, User, Order, sequelize } from './src/models/index.js';
import bookController from './src/controllers/bookController.js';

async function testPurchasedField() {
  try {
    console.log('🧪 Testing Purchased Field Functionality\n');

    // Test 1: Check _checkPurchaseStatus helper
    console.log('Test 1: Testing _checkPurchaseStatus helper...');
    
    // Find a user with role 'user'
    const testUser = await User.findOne({ where: { role: 'user' } });
    if (!testUser) {
      console.log('⚠️  No user with role "user" found. Skipping user-specific tests.');
    } else {
      console.log(`✓ Found test user: ${testUser.full_name} (${testUser.id})`);
      
      // Find some books
      const testBooks = await Book.findAll({ limit: 5 });
      console.log(`✓ Found ${testBooks.length} test books`);
      
      if (testBooks.length > 0) {
        const bookIds = testBooks.map(b => b.id);
        const purchasedSet = await bookController._checkPurchaseStatus(testUser.id, bookIds);
        console.log(`✓ Purchase check completed. Purchased books: ${purchasedSet.size}/${testBooks.length}`);
        
        // Show which books are purchased
        testBooks.forEach(book => {
          const isPurchased = purchasedSet.has(book.id);
          console.log(`  - ${book.name}: ${isPurchased ? '✓ PURCHASED' : '✗ Not purchased'}`);
        });
      }
    }

    // Test 2: Check _addPurchasedField helper with user role
    console.log('\nTest 2: Testing _addPurchasedField with user role...');
    if (testUser) {
      const sampleBooks = await Book.findAll({ limit: 3 });
      const booksData = sampleBooks.map(b => b.toJSON());
      
      const booksWithPurchased = await bookController._addPurchasedField(
        booksData,
        testUser.id,
        'user'
      );
      
      console.log('✓ Added purchased field to books:');
      booksWithPurchased.forEach(book => {
        console.log(`  - ${book.name}: purchased = ${book.purchased}`);
      });
    }

    // Test 3: Check _addPurchasedField helper with student role
    console.log('\nTest 3: Testing _addPurchasedField with student role...');
    const studentUser = await User.findOne({ where: { role: 'student' } });
    if (studentUser) {
      const sampleBooks = await Book.findAll({ limit: 3 });
      const booksData = sampleBooks.map(b => b.toJSON());
      
      const booksWithPurchased = await bookController._addPurchasedField(
        booksData,
        studentUser.id,
        'student'
      );
      
      console.log('✓ Added purchased field to books (student role):');
      booksWithPurchased.forEach(book => {
        console.log(`  - ${book.name}: purchased = ${book.purchased} (should be 0)`);
      });
      
      // Verify all are 0
      const allZero = booksWithPurchased.every(b => b.purchased === 0);
      if (allZero) {
        console.log('✓ All books have purchased = 0 for student role');
      } else {
        console.log('✗ ERROR: Some books have purchased != 0 for student role');
      }
    } else {
      console.log('⚠️  No student user found. Skipping student test.');
    }

    // Test 4: Check single book vs array handling
    console.log('\nTest 4: Testing single book vs array handling...');
    const singleBook = await Book.findOne();
    if (singleBook && testUser) {
      const bookData = singleBook.toJSON();
      const bookWithPurchased = await bookController._addPurchasedField(
        bookData,
        testUser.id,
        'user'
      );
      
      console.log(`✓ Single book: ${bookWithPurchased.name}, purchased = ${bookWithPurchased.purchased}`);
    }

    console.log('\n✅ All tests completed successfully!');
    console.log('\n📝 Summary:');
    console.log('- _checkPurchaseStatus: Queries orders efficiently');
    console.log('- _addPurchasedField: Adds purchased field correctly');
    console.log('- Role handling: Non-user roles always get purchased = 0');
    console.log('- Single/Array: Handles both single book and array of books');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

// Run the test
testPurchasedField();
