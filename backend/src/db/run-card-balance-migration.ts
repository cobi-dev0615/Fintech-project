import { db } from './connection.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runCardBalanceMigration() {
  try {
    console.log('🔄 Running card balance migration...');
    const migrationPath = join(__dirname, '../../migrations/002_add_card_balance.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    console.log('📄 Migration file loaded');
    await db.query(migrationSQL);
    console.log('✅ Card balance migration completed successfully!');
    
    // Verify the column was added
    const result = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'pluggy_credit_cards' AND column_name = 'balance'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Verified: balance column exists in pluggy_credit_cards table');
    } else {
      console.warn('⚠️  Warning: balance column not found after migration');
    }
    
    process.exit(0);
  } catch (error: any) {
    if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      console.log('ℹ️  Column already exists, skipping...');
      process.exit(0);
    }
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

runCardBalanceMigration();
