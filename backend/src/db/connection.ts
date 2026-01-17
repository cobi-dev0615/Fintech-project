import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Build connection config from DATABASE_URL or individual parameters
const getDbConfig = () => {
  // If DATABASE_URL is provided, use it
  if (process.env.DATABASE_URL) {
    return {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    };
  }

  // Otherwise, use individual parameters
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'fintech_db',
    user: process.env.DB_USER || 'fintech_user',
    password: process.env.DB_PASSWORD || 'Basketball@0615',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  };
};

export const db = new Pool(getDbConfig());

// Test connection on startup
db.connect()
  .then((client) => {
    console.log('✅ Database connected successfully');
    client.release();
  })
  .catch((err) => {
    console.error('❌ Database connection error:', err.message);
    console.error('Please check your database configuration in .env file');
});
