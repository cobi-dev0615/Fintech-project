import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { db } from './connection.js';
import dotenv from 'dotenv';

dotenv.config();

const executeSchema = async () => {
  try {
    console.log('🔄 Starting schema execution...');
    
    // Read the schema.sql file
    const schemaPath = join(dirname(fileURLToPath(import.meta.url)), '../../schema.sql');
    const schemaSQL = readFileSync(schemaPath, 'utf-8');
    
    console.log('📄 Schema file loaded');
    
    // Use psql-style execution - split by semicolon but preserve DO blocks
    // Execute using Node.js child_process to run psql
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    // Get DATABASE_URL from environment
    const dbUrl = process.env.DATABASE_URL || 
      `postgresql://${process.env.DB_USER || 'fintech_user'}:${process.env.DB_PASSWORD || 'Basketball@0615'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'fintech_db'}`;
    
    console.log('📝 Executing schema.sql using psql...');
    
    // Write SQL to temp file and execute
    const { writeFileSync, unlinkSync } = await import('fs');
    const tempFile = join(dirname(fileURLToPath(import.meta.url)), '../../schema_temp.sql');
    
    try {
      writeFileSync(tempFile, schemaSQL);
      
      const { stdout, stderr } = await execAsync(
        `psql "${dbUrl}" -f "${tempFile}" 2>&1 || true`
      );
      
      // Filter out expected "already exists" errors
      const lines = (stdout + stderr).split('\n');
      const errors: string[] = [];
      const warnings: string[] = [];
      
      for (const line of lines) {
        if (line.includes('ERROR')) {
          if (line.includes('already exists') || 
              line.includes('duplicate_object') ||
              line.includes('relation') && line.includes('already exists')) {
            warnings.push(line);
          } else {
            errors.push(line);
          }
        } else if (line.includes('CREATE') || line.includes('INSERT')) {
          // Success indicators
        }
      }
      
      if (warnings.length > 0) {
        console.log(`⚠️  ${warnings.length} warnings (expected if schema already partially applied)`);
      }
      
      if (errors.length > 0) {
        console.error('❌ Errors:');
        errors.forEach(err => console.error('  ', err));
        process.exit(1);
      }
      
      console.log('✅ Schema executed successfully!');
      
    } finally {
      // Clean up temp file
      try {
        unlinkSync(tempFile);
      } catch (e) {
        // Ignore
      }
    }
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Schema execution failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await db.end();
  }
};

executeSchema();
