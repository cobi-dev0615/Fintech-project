import { db } from './connection.js';
import dotenv from 'dotenv';

dotenv.config();

// Banks for Pessoa Física (Individual)
const individualBanks = [
  'Itaú',
  'XP Banking',
  'Bradesco',
  'Mercado Pago',
  'Santander',
  'Banco do Brasil',
  'Nubank',
  'Caixa Econômica Federal',
  'C6 Bank',
  'Safra',
  'Itaú Cartões',
  'PicPay',
  'Banco PAN',
  'Sicoob',
  'Banrisul',
  'Sicredi',
  'Unicred',
  'Banco do Nordeste do Brasil',
  'BTGPactual',
  'Neon',
  'PagBank',
  'SafraPay',
  'Safra Financeira',
  'Banco Sofisa',
  'RecargaPay',
  'Bradescard',
  'Necton',
  'Santander Cartões',
  'Banco BRB',
  'Inter',
  'Porto Bank',
  'Dock',
];

// Banks for Pessoa Jurídica (Legal Entity) - empty in image, but we'll add common ones
const legalEntityBanks = [
  'Itaú Empresas',
  'Bradesco Empresas',
  'Santander Empresas',
  'Banco do Brasil Empresas',
  'Banrisul Empresas',
];

// Brokers (Corretoras)
const brokers = [
  'Rico Investimentos',
  'BTGPactual Investimentos',
  'Ágora Investimentos',
  'Clear Corretora',
  'Investimentos BB',
  'Ion',
  'Monte Bravo',
  'Toro Investimentos',
  'EQI',
  'Santander Corretora',
  'Santander Corretora Empresas',
];

const seedInstitutions = async () => {
  const client = await db.connect();
  
  try {
    console.log('🌱 Starting institutions seeding...');

    // Ensure institutions table exists and has enabled column
    try {
      await client.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'institutions' AND column_name = 'enabled'
          ) THEN
            ALTER TABLE institutions ADD COLUMN enabled BOOLEAN NOT NULL DEFAULT true;
          END IF;
        END $$;
      `);
    } catch (err: any) {
      console.log('ℹ️  Enabled column check:', err.message);
    }

    // Ensure connection_provider type exists
    try {
      await client.query(`
        DO $$ BEGIN
          CREATE TYPE connection_provider AS ENUM ('open_finance', 'b3');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
      `);
    } catch (err: any) {
      // Type might already exist
    }

    // Ensure institutions table exists
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS institutions (
          id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          provider           connection_provider NOT NULL,
          external_id        TEXT,
          name               TEXT NOT NULL,
          logo_url           TEXT,
          enabled            BOOLEAN NOT NULL DEFAULT true,
          created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE(provider, external_id)
        );
      `);
    } catch (err: any) {
      console.log('ℹ️  Institutions table check:', err.message);
    }

    let inserted = 0;
    let skipped = 0;

    // Insert individual banks
    console.log('\n📦 Inserting individual banks...');
    for (const bankName of individualBanks) {
      try {
        const result = await client.query(
          `INSERT INTO institutions (provider, name, enabled, external_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (provider, external_id) 
           DO UPDATE SET name = $2, enabled = $3, updated_at = NOW()
           RETURNING id, name`,
          ['open_finance', bankName, true, `individual_${bankName.toLowerCase().replace(/\s+/g, '_')}`]
        );
        
        if (result.rows.length > 0) {
          inserted++;
          console.log(`  ✅ ${bankName}`);
        }
      } catch (error: any) {
        if (error.code === '23505') {
          skipped++;
          console.log(`  ⏭️  ${bankName} (already exists)`);
        } else {
          console.error(`  ❌ Error inserting ${bankName}:`, error.message);
        }
      }
    }

    // Insert legal entity banks
    console.log('\n📦 Inserting legal entity banks...');
    for (const bankName of legalEntityBanks) {
      try {
        const result = await client.query(
          `INSERT INTO institutions (provider, name, enabled, external_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (provider, external_id) 
           DO UPDATE SET name = $2, enabled = $3, updated_at = NOW()
           RETURNING id, name`,
          ['open_finance', bankName, true, `legal_${bankName.toLowerCase().replace(/\s+/g, '_')}`]
        );
        
        if (result.rows.length > 0) {
          inserted++;
          console.log(`  ✅ ${bankName}`);
        }
      } catch (error: any) {
        if (error.code === '23505') {
          skipped++;
          console.log(`  ⏭️  ${bankName} (already exists)`);
        } else {
          console.error(`  ❌ Error inserting ${bankName}:`, error.message);
        }
      }
    }

    // Insert brokers
    console.log('\n📦 Inserting brokers...');
    for (const brokerName of brokers) {
      try {
        const result = await client.query(
          `INSERT INTO institutions (provider, name, enabled, external_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (provider, external_id) 
           DO UPDATE SET name = $2, enabled = $3, updated_at = NOW()
           RETURNING id, name`,
          ['open_finance', brokerName, true, `broker_${brokerName.toLowerCase().replace(/\s+/g, '_')}`]
        );
        
        if (result.rows.length > 0) {
          inserted++;
          console.log(`  ✅ ${brokerName}`);
        }
      } catch (error: any) {
        if (error.code === '23505') {
          skipped++;
          console.log(`  ⏭️  ${brokerName} (already exists)`);
        } else {
          console.error(`  ❌ Error inserting ${brokerName}:`, error.message);
        }
      }
    }

    console.log(`\n✅ Institutions seeding completed!`);
    console.log(`   Inserted/Updated: ${inserted}`);
    console.log(`   Skipped (already exists): ${skipped}`);
    console.log(`   Total: ${individualBanks.length + legalEntityBanks.length + brokers.length}`);

  } catch (error: any) {
    console.error('❌ Error seeding institutions:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedInstitutions()
    .then(() => {
      console.log('✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { seedInstitutions };
