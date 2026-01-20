import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';

export async function plansRoutes(fastify: FastifyInstance) {
  // Get all active plans (public endpoint - no authentication required)
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      type PlanItem = {
        id: string;
        code: string;
        name: string;
        priceCents: number;
        connectionLimit: number | null;
        features: string[];
        isActive: boolean;
      };
      let plans: PlanItem[] = [];
      try {
        const plansResult = await db.query(
          `SELECT id, code, name, price_cents, connection_limit, features_json, is_active
           FROM plans
           WHERE is_active = true
           ORDER BY price_cents ASC`
        );
        plans = plansResult.rows.map(row => ({
          id: row.id,
          code: row.code,
          name: row.name,
          priceCents: row.price_cents,
          connectionLimit: row.connection_limit,
          features: row.features_json?.features || [],
          isActive: row.is_active,
        }));
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
