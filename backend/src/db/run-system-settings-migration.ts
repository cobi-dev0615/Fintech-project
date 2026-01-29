import { db } from './connection.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runSystemSettingsMigration() {
  try {
    console.log('Running system_settings migration (003_system_settings.sql)...');
    const migrationPath = join(__dirname, '../../migrations/003_system_settings.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    await db.query(migrationSQL);
    console.log('System settings migration completed successfully.');

    const result = await db.query(
      `SELECT key, value FROM system_settings WHERE key = 'registration_requires_approval'`
    );
    if (result.rows.length > 0) {
      console.log('Verified: registration_requires_approval =', result.rows[0].value);
    }
    process.exit(0);
  } catch (error: any) {
    if (error.message?.includes('already exists') || error.code === '42P07') {
      console.log('system_settings table already exists, skipping.');
      process.exit(0);
    }
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await db.end();
  }
}

runSystemSettingsMigration();
