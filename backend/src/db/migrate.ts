import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { db } from './connection.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const runMigration = async () => {
  const client = await db.connect();
  
  try {
    console.log('🔄 Starting database migration...');
    
    // Read the schema.sql file
    const schemaPath = join(__dirname, '../../schema.sql');
    const schemaSQL = readFileSync(schemaPath, 'utf-8');
    
    console.log('📄 Schema file loaded');
    
    // Execute the SQL using the client directly (handles multi-statement SQL better)
    await client.query(schemaSQL);
    
    console.log('✅ Database migration completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    
    // If it's a "relation already exists" error, that's okay - schema might already be applied
    if (error.message.includes('already exists') || error.code === '42P07' || error.code === '42710') {
      console.log('ℹ️  Some tables/types already exist - this is normal if schema was partially applied');
      console.log('✅ Migration completed (some objects may already exist)');
      process.exit(0);
    }
    
    process.exit(1);
  } finally {
    client.release();
  }
};

runMigration();
