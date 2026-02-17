import { db } from './connection.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Feature codes:
 *   connections    - Bank connections (limit = max count, null = unlimited)
 *   reports        - Report generation per month (limit = max/month, null = unlimited, 0 = blocked)
 *   goals          - Financial goals (limit = max count, null = unlimited)
 *   ai             - AI Financial assistant (0 = blocked, null = unlimited)
 *   alerts         - Custom alerts (0 = blocked, null = unlimited)
 *   b3             - B3 integration (0 = blocked, null = unlimited)
 *   calculators    - Financial calculators (limit = number available, null = all)
 *   messages       - Consultant messaging (0 = blocked, null = unlimited)
 *   clients        - Client management (0 = blocked, null = unlimited)
 *   pipeline       - Sales pipeline (0 = blocked, null = unlimited)
 *   invitations    - Send invitations (0 = blocked, null = unlimited)
 *   simulator      - Portfolio simulator (0 = blocked, null = unlimited)
 *   whitelabel     - White label reports (0 = blocked, null = unlimited)
 *   api_access     - API access (0 = blocked, null = unlimited)
 */

const PLAN_FEATURES: Record<string, Record<string, number | null>> = {
  free: {
    connections: 1,
    reports: 0,
    goals: 1,
    ai: 0,
    alerts: 0,
    b3: 0,
    calculators: 1,
    messages: 0,
    clients: 0,
    pipeline: 0,
    invitations: 0,
    simulator: 0,
    whitelabel: 0,
    api_access: 0,
  },
  basic: {
    connections: 3,
    reports: 3,
    goals: 3,
    ai: 0,
    alerts: 0,
    b3: null,       // unlimited
    calculators: null,
    messages: null,
    clients: 0,
    pipeline: 0,
    invitations: 0,
    simulator: 0,
    whitelabel: 0,
    api_access: 0,
  },
  pro: {
    connections: 10,
    reports: null,   // unlimited
    goals: null,
    ai: null,
    alerts: null,
    b3: null,
    calculators: null,
    messages: null,
    clients: 0,
    pipeline: 0,
    invitations: 0,
    simulator: 0,
    whitelabel: 0,
    api_access: 0,
  },
  consultant: {
    connections: null,  // unlimited
    reports: null,
    goals: null,
    ai: null,
    alerts: null,
    b3: null,
    calculators: null,
    messages: null,
    clients: null,
    pipeline: null,
    invitations: null,
    simulator: null,
    whitelabel: null,
    api_access: 0,
  },
  enterprise: {
    connections: null,
    reports: null,
    goals: null,
    ai: null,
    alerts: null,
    b3: null,
    calculators: null,
    messages: null,
    clients: null,
    pipeline: null,
    invitations: null,
    simulator: null,
    whitelabel: null,
    api_access: null,
  },
};

const seedPlanFeatures = async () => {
  const client = await db.connect();

  try {
    console.log('🔄 Seeding plan_features table...');

    // Create table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS plan_features (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_id       UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
        feature_code  TEXT NOT NULL,
        limit_value   INTEGER,
        UNIQUE(plan_id, feature_code)
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_plan_features_plan ON plan_features(plan_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_plan_features_code ON plan_features(feature_code)');

    for (const [planCode, features] of Object.entries(PLAN_FEATURES)) {
      // Get plan ID
      const planResult = await client.query('SELECT id FROM plans WHERE code = $1', [planCode]);
      if (planResult.rows.length === 0) {
        console.log(`⚠️  Plan "${planCode}" not found, skipping`);
        continue;
      }
      const planId = planResult.rows[0].id;

      for (const [featureCode, limitValue] of Object.entries(features)) {
        await client.query(
          `INSERT INTO plan_features (plan_id, feature_code, limit_value)
           VALUES ($1, $2, $3)
           ON CONFLICT (plan_id, feature_code)
           DO UPDATE SET limit_value = $3`,
          [planId, featureCode, limitValue]
        );
      }
      console.log(`✅ Seeded features for plan: ${planCode}`);
    }

    console.log('✅ Plan features seeded successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Seed failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await db.end();
  }
};

seedPlanFeatures();
