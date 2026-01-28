import { db } from './connection.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runPluggyMigration() {
  try {
    console.log('🔄 Running Pluggy tables migration...');
    
    // Read the migration file from the migrations folder in backend
    const migrationPath = join(__dirname, '../../migrations/001_pluggy_tables.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    console.log('📄 Migration file loaded');
    
    // Execute the SQL
    await db.query(migrationSQL);
    
    console.log('✅ Pluggy tables migration completed successfully!');
    
    // Verify tables were created
    const tables = [
      'pluggy_accounts',
      'pluggy_transactions',
      'pluggy_investments',
      'pluggy_credit_cards',
      'pluggy_card_invoices',
    ];
    
    for (const table of tables) {
      const result = await db.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [table]
      );
      
      if (result.rows[0].exists) {
        console.log(`  ✓ Table ${table} exists`);
      } else {
        console.log(`  ⚠️  Table ${table} not found`);
      }
    }
    
    process.exit(0);
  } catch (error: any) {
    // If tables already exist, that's okay
    if (
      error.message.includes('already exists') ||
      error.message.includes('duplicate') ||
      error.code === '42P07' || // duplicate_table
      error.code === '42710' || // duplicate_object
      error.code === '42P16' // invalid_table_definition
    ) {
      console.log('⚠️  Some tables already exist, continuing...');
      console.log('✅ Migration check completed');
      process.exit(0);
    } else {
      console.error('❌ Migration failed:', error.message);
      console.error(error);
      process.exit(1);
    }
  } finally {
    await db.end();
  }
}

runPluggyMigration();
