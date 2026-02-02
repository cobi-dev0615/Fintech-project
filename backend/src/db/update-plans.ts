import { db } from './connection.js';
import dotenv from 'dotenv';

dotenv.config();

const updatePlans = async () => {
  const client = await db.connect();
  
  try {
    console.log('🔄 Updating plans in database...');
    
    // All users (customer and consultant) share the same subscription plans
    const plans = [
      {
        code: 'free',
        name: 'Free',
        priceCents: 0,
        connectionLimit: 1,
        features: [
          '1 conexão bancária',
          'Dashboard básico',
          'Cotações de mercado',
        ],
      },
      {
        code: 'basic',
        name: 'Basic',
        priceCents: 2990, // R$ 29.90
        connectionLimit: 3,
        features: [
          '3 conexões bancárias',
          'Relatórios mensais',
          'Câmbio e Crédito',
          'Suporte por email',
        ],
      },
      {
        code: 'pro',
        name: 'Pro',
        priceCents: 7990, // R$ 79.90
        connectionLimit: 10,
        features: [
          '10 conexões bancárias',
          'IA Financeira',
          'Relatórios ilimitados',
          'Suporte prioritário',
          'Alertas personalizados',
        ],
      },
      {
        code: 'consultant',
        name: 'Consultant',
        priceCents: 29990, // R$ 299.90
        connectionLimit: null, // unlimited
        features: [
          'Conexões ilimitadas',
          'Área do cliente',
          'Relatórios personalizados',
          'Suporte prioritário',
          'White label',
        ],
      },
      {
        code: 'enterprise',
        name: 'Enterprise',
        priceCents: 49990, // R$ 499.90
        connectionLimit: null, // unlimited
        features: [
          'Conexões ilimitadas',
          'Acesso à API',
          'White label completo',
          'Suporte dedicado',
          'Integrações customizadas',
        ],
      },
    ];

    for (const plan of plans) {
      // Check if plan exists
      const existingPlan = await client.query(
        'SELECT id FROM plans WHERE code = $1',
        [plan.code]
      );

      if (existingPlan.rows.length > 0) {
        // Update existing plan - set role to NULL so it's available to all users
        await client.query(
          `UPDATE plans 
           SET name = $1, 
               price_cents = $2, 
               monthly_price_cents = $2,
               annual_price_cents = $2 * 10,
               connection_limit = $3,
               features_json = $4,
               role = NULL,
               is_active = true,
               updated_at = NOW()
           WHERE code = $5`,
          [
            plan.name,
            plan.priceCents,
            plan.connectionLimit,
            JSON.stringify({ features: plan.features }),
            plan.code,
          ]
        );
        console.log(`✅ Updated plan: ${plan.name}`);
      } else {
        // Insert new plan
        await client.query(
          `INSERT INTO plans (code, name, price_cents, monthly_price_cents, annual_price_cents, currency, connection_limit, features_json, is_active, role)
           VALUES ($1, $2, $3, $3, $3 * 10, 'BRL', $4, $5, true, NULL)`,
          [
            plan.code,
            plan.name,
            plan.priceCents,
            plan.connectionLimit,
            JSON.stringify({ features: plan.features }),
          ]
        );
        console.log(`✅ Inserted plan: ${plan.name}`);
      }
    }
    
    console.log('✅ Plans update completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Plans update failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await db.end();
  }
};

updatePlans();
