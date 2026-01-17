import bcrypt from 'bcrypt';
import { db } from './connection.js';
import dotenv from 'dotenv';

dotenv.config();

const users = [
  {
    email: 'customer@zurt.com',
    password: 'basketball@0615',
    role: 'customer' as const,
    full_name: 'Customer User',
  },
  {
    email: 'consultant@zurt.com',
    password: 'basketball@0615',
    role: 'consultant' as const,
    full_name: 'Consultant User',
  },
  {
    email: 'admin@zurt.com',
    password: 'basketball@0615',
    role: 'admin' as const,
    full_name: 'Admin User',
  },
];

const seedUsers = async () => {
  const client = await db.connect();
  
  try {
    console.log('🌱 Starting user seeding...');

    // First, ensure the schema exists (create users table if needed)
    try {
      await client.query(`
        DO $$ BEGIN
          CREATE TYPE user_role AS ENUM ('customer', 'consultant', 'admin');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
      `);
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          role               user_role NOT NULL,
          full_name          TEXT NOT NULL,
          email              TEXT NOT NULL UNIQUE,
          password_hash      TEXT,
          phone              TEXT,
          country_code       TEXT DEFAULT 'BR',
          is_active          BOOLEAN NOT NULL DEFAULT TRUE,
          birth_date         DATE,
          risk_profile       TEXT,
          created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `);
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS consultant_profiles (
          user_id            UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          company_name       TEXT,
          certification      TEXT,
          watermark_text     TEXT,
          calendly_url       TEXT,
          created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `);
      
      console.log('✅ Database schema verified/created');
    } catch (schemaError: any) {
      // Schema might already exist, that's okay
      if (!schemaError.message.includes('already exists') && !schemaError.code?.match(/42P07|42710/)) {
        console.log('ℹ️  Schema setup warning:', schemaError.message);
      }
    }

    // Hash password once for all users (same password)
    const passwordHash = await bcrypt.hash('basketball@0615', 10);
    console.log('✅ Password hashed successfully');

    for (const userData of users) {
      try {
        // Check if user already exists
        const existingUser = await client.query(
          'SELECT id, email FROM users WHERE email = $1',
          [userData.email]
        );

        if (existingUser.rows.length > 0) {
          console.log(`⏭️  User ${userData.email} already exists, skipping...`);
          continue;
        }

        // Insert user
        const result = await client.query(
          `INSERT INTO users (email, password_hash, role, full_name, is_active, country_code)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, email, role, full_name`,
          [userData.email, passwordHash, userData.role, userData.full_name, true, 'BR']
        );

        const newUser = result.rows[0];
        console.log(`✅ Created user: ${newUser.email} (${newUser.role})`);

        // If consultant, create consultant profile
        if (userData.role === 'consultant') {
          await client.query(
            `INSERT INTO consultant_profiles (user_id, company_name, certification)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id) DO NOTHING`,
            [newUser.id, 'zurT Financial Consulting', 'CFP - Certified Financial Planner']
          );
          console.log(`✅ Created consultant profile for ${newUser.email}`);
        }
      } catch (error: any) {
        // If error is unique constraint violation, user already exists
        if (error.code === '23505') {
          console.log(`⏭️  User ${userData.email} already exists (unique constraint), skipping...`);
        } else {
          console.error(`❌ Error creating user ${userData.email}:`, error.message);
        }
      }
    }

    console.log('✅ User seeding completed!');
    console.log('\n📋 Created users:');
    console.log('   - Customer: customer@zurt.com / basketball@0615');
    console.log('   - Consultant: consultant@zurt.com / basketball@0615');
    console.log('   - Admin: admin@zurt.com / basketball@0615');
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
  }
};

// Run seed
seedUsers();
