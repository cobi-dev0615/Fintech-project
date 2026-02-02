import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';

export async function plansRoutes(fastify: FastifyInstance) {
  // Get all active plans (public endpoint - no authentication required)
  // Both customers and consultants see the same plans
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { billingPeriod = 'monthly' } = request.query as any;
      
      type PlanItem = {
        id: string;
        code: string;
        name: string;
        monthlyPriceCents: number;
        annualPriceCents: number;
        priceCents: number; // Current selected billing period price
        connectionLimit: number | null;
        features: string[];
        isActive: boolean;
        role: string | null;
      };
      let plans: PlanItem[] = [];
      try {
        // Check if plans table has billing_period columns
        let hasBillingColumns = false;
        try {
          await db.query('SELECT monthly_price_cents, annual_price_cents FROM plans LIMIT 1');
          hasBillingColumns = true;
        } catch {}

        const query = `
          SELECT 
            id, 
            code, 
            name, 
            price_cents,
            ${hasBillingColumns ? 'monthly_price_cents, annual_price_cents,' : 'price_cents as monthly_price_cents, price_cents as annual_price_cents,'}
            connection_limit, 
            features_json, 
            is_active
          FROM plans
          WHERE is_active = true
          ORDER BY price_cents ASC
        `;

        const plansResult = await db.query(query);
        
        plans = plansResult.rows.map(row => {
          const monthlyPrice = hasBillingColumns ? (row.monthly_price_cents || row.price_cents) : row.price_cents;
          const annualPrice = hasBillingColumns ? (row.annual_price_cents || row.price_cents * 10) : row.price_cents * 10; // Default to 10 months if annual not set
          const selectedPrice = billingPeriod === 'annual' ? annualPrice : monthlyPrice;
          
          return {
            id: row.id,
            code: row.code,
            name: row.name,
            monthlyPriceCents: monthlyPrice,
            annualPriceCents: annualPrice,
            priceCents: selectedPrice,
            connectionLimit: row.connection_limit,
            features: row.features_json?.features || [],
            isActive: row.is_active,
            role: null, // Plans are available to all users
          };
        });
      } catch (e: any) {
        // Plans table might not exist
        fastify.log.warn('Plans table does not exist or error fetching plans:', e?.message || e);
        return reply.send({ plans: [] });
      }

      return reply.send({ plans });
    } catch (error: any) {
      fastify.log.error('Error fetching plans:', error);
      reply.code(500).send({ error: 'Failed to fetch plans', details: error.message });
    }
  });
}
