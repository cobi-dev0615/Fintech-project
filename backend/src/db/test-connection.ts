import { db } from './connection.js';

async function testConnection() {
  try {
    console.log('Testing database connection...');
    const result = await db.query('SELECT NOW() as current_time, current_database() as database_name, current_user as user_name');
    console.log('✅ Connection successful!');
    console.log('Database:', result.rows[0].database_name);
    console.log('User:', result.rows[0].user_name);
    console.log('Current time:', result.rows[0].current_time);
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Connection failed:', error.message);
    console.error('\nPlease verify:');
    console.error('1. PostgreSQL is running');
    console.error('2. Database "fintech_db" exists');
    console.error('3. User "fintech_user" exists and has access');
    console.error('4. Password is correct');
    console.error('5. Connection string in .env is properly formatted');
    process.exit(1);
  }
}

testConnection();

