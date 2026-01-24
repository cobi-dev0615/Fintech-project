import { db } from './connection.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration(fileName: string) {
  try {
    console.log(`Running migration: ${fileName}`);
    const migrationPath = join(__dirname, 'migrations', fileName);
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    // Remove comments and split into statements more carefully
    // First, handle multi-line comments and single-line comments
    let cleanedSQL = migrationSQL
      .replace(/--.*$/gm, '') // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove multi-line comments
    
    // Execute the entire SQL file as one query
    // PostgreSQL supports multiple statements separated by semicolons
    try {
      await db.query(cleanedSQL);
      console.log(`✅ Migration ${fileName} completed successfully`);
    } catch (error: any) {
      // If the table/function/index already exists, that's ok
      if (
        error.message.includes('already exists') ||
        error.message.includes('duplicate') ||
        error.code === '42P07' || // duplicate_table
        error.code === '42710' || // duplicate_object
        error.code === '42P16' // invalid_table_definition (sometimes)
      ) {
        console.log(`⚠️  Some objects already exist in ${fileName}, continuing...`);
      } else {
        throw error;
      }
    }
  } catch (error: any) {
    console.error(`❌ Migration ${fileName} failed:`, error.message);
    throw error;
  }
}

// Run all migrations
async function runAllMigrations() {
  try {
    console.log('Starting database migrations...');
    await runMigration('001_create_admin_tables.sql');
    await runMigration('002_add_plan_role_and_billing.sql');
    await runMigration('003_create_login_history.sql');
    await runMigration('004_add_consultant_plan.sql');
    await runMigration('005_create_crm_leads.sql');
    await runMigration('006_create_conversations_messages.sql');
    await runMigration('007_update_report_types.sql');
    await runMigration('008_create_notification_preferences.sql');
    await runMigration('009_create_comments_table.sql');
    console.log('✅ All migrations completed');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

runAllMigrations();

