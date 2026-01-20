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
    
    // Split SQL into individual statements
    // Split by semicolon, but preserve DO $$ blocks
    const statements: string[] = [];
    let currentStatement = '';
    let inDoBlock = false;
    let doBlockDepth = 0;
    
    const lines = schemaSQL.split('\n');
    
    for (const line of lines) {
      // Skip comments
      if (line.trim().startsWith('--')) {
        continue;
      }
      
      // Check for DO $$ BEGIN blocks
      if (line.includes('DO $$')) {
        inDoBlock = true;
        doBlockDepth = 0;
      }
      
      if (inDoBlock) {
        // Count BEGIN/END pairs
        const beginMatches = (line.match(/\bBEGIN\b/gi) || []).length;
        const endMatches = (line.match(/\bEND\s*\$\$/gi) || []).length;
        doBlockDepth += beginMatches - endMatches;
        
        currentStatement += line + '\n';
        
        if (doBlockDepth <= 0 && endMatches > 0) {
          inDoBlock = false;
          if (currentStatement.trim()) {
            statements.push(currentStatement.trim());
          }
          currentStatement = '';
        }
      } else {
        currentStatement += line + '\n';
        
        // If line ends with semicolon and we're not in a DO block, it's a complete statement
        if (line.trim().endsWith(';') && !currentStatement.includes('DO $$')) {
          const trimmed = currentStatement.trim();
          if (trimmed) {
            statements.push(trimmed);
          }
          currentStatement = '';
        }
      }
    }
    
    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement separately
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (!statement || statement === ';') continue;
      
      try {
        await client.query(statement);
        if ((i + 1) % 10 === 0) {
          console.log(`  ✓ Executed ${i + 1}/${statements.length} statements...`);
        }
      } catch (error: any) {
        // If it's a "relation already exists" error, that's okay
        if (error.message.includes('already exists') || 
            error.code === '42P07' || 
            error.code === '42710' ||
            error.message.includes('duplicate_object')) {
          // Skip - object already exists
          continue;
        }
        // If it's an index error (column doesn't exist), skip it
        if (error.code === '42703' || error.message.includes('does not exist')) {
          if (statement.toUpperCase().includes('CREATE INDEX')) {
            console.log(`  ⚠️  Skipping index (column may not exist): ${statement.substring(0, 80)}...`);
            continue;
          }
        }
        console.error(`❌ Error executing statement ${i + 1}:`);
        console.error(`SQL: ${statement.substring(0, 100)}...`);
        throw error;
      }
    }
    
    console.log('✅ Database migration completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await db.end();
  }
};

runMigration();
