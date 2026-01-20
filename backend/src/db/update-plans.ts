import { db } from './connection.js';
import dotenv from 'dotenv';

dotenv.config();

const updatePlans = async () => {
  const client = await db.connect();
  
  try {
    console.log('🔄 Updating plans in database...');
    
    // Update each plan with new data
    const plans = [
      {
        code: 'free',
        name: 'Gratuito',
        priceCents: 0,
        connectionLimit: 1,
        features: ['1 conexão bancária', 'Dashboard básico', 'Cotações de mercado']
      },
      {
        code: 'basic',
        name: 'Básico',
        priceCents: 2990,
        connectionLimit: 3,
        features: ['3 conexões bancárias', 'Relatórios mensais', 'Câmbio e Crédito', 'Suporte por email']
      },
      {
        code: 'pro',
        name: 'Profissional',
        priceCents: 7990,
        connectionLimit: 10,
        features: ['10 conexões bancárias', 'IA Financeira', 'Relatórios ilimitados', 'Suporte prioritário', 'Alertas personalizados']
      },
    ];

    for (const plan of plans) {
      // Check if plan exists
      const existingPlan = await client.query(
        'SELECT id FROM plans WHERE code = $1',
        [plan.code]
      );

      if (existingPlan.rows.length > 0) {
        // Update existing plan
        await client.query(
          `UPDATE plans 
           SET name = $1, 
               price_cents = $2, 
               connection_limit = $3,
               features_json = $4,
               updated_at = NOW()
           WHERE code = $5`,
          [
            plan.name,
            plan.priceCents,
            plan.connectionLimit,
            JSON.stringify({ features: plan.features }),
            plan.code
          ]
        );
        console.log(`✅ Updated plan: ${plan.name}`);
      } else {
        // Insert new plan
        await client.query(
          `INSERT INTO plans (code, name, price_cents, currency, connection_limit, features_json)
           VALUES ($1, $2, $3, 'BRL', $4, $5)`,
          [
            plan.code,
            plan.name,
            plan.priceCents,
            plan.connectionLimit,
            JSON.stringify({ features: plan.features })
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
