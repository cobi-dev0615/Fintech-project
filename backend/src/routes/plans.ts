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
        subscriberCount: number;
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
            p.id,
            p.code,
            p.name,
            p.price_cents,
            ${hasBillingColumns ? 'p.monthly_price_cents, p.annual_price_cents,' : 'p.price_cents as monthly_price_cents, p.price_cents as annual_price_cents,'}
            p.connection_limit,
            p.features_json,
            p.is_active,
            COALESCE(sc.subscriber_count, 0)::int as subscriber_count
          FROM plans p
          LEFT JOIN (
            SELECT plan_id, COUNT(*) as subscriber_count
            FROM subscriptions
            WHERE status = 'active'
            GROUP BY plan_id
          ) sc ON sc.plan_id = p.id
          WHERE p.is_active = true
          ORDER BY p.price_cents ASC
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
            subscriberCount: row.subscriber_count || 0,
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
