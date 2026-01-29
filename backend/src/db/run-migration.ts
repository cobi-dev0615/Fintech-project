import { db } from './connection.js';
import { readFileSync, readdirSync } from 'fs';
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
    let cleanedSQL = migrationSQL
      .replace(/--.*$/gm, '') // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove multi-line comments

    try {
      await db.query(cleanedSQL);
      console.log(`✅ Migration ${fileName} completed successfully`);
    } catch (error: any) {
      // If the table/function/index already exists, that's ok
      if (
        error.message?.includes('already exists') ||
        error.message?.includes('duplicate') ||
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

/** Run all migrations in backend/src/db/migrations/ in filename order (001_*.sql, 002_*.sql, ...). */
async function runAllMigrations() {
  try {
    const migrationsDir = join(__dirname, 'migrations');
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('No migration files found.');
      return;
    }

    console.log(`Starting database migrations (${files.length} file(s))...`);
    for (const fileName of files) {
      await runMigration(fileName);
    }
    console.log('✅ All migrations completed');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

runAllMigrations();
