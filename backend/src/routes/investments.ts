import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';

export async function investmentsRoutes(fastify: FastifyInstance) {
  // Get all holdings
  fastify.get('/holdings', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      
      // Check if holdings table exists
      let hasHoldings = false;
      try {
        await db.query('SELECT 1 FROM holdings LIMIT 1');
        hasHoldings = true;
      } catch {}

      if (!hasHoldings) {
        return reply.send({ holdings: [] });
      }

      // Check if assets table exists (for the JOIN)
      let hasAssets = false;
      try {
        await db.query('SELECT 1 FROM assets LIMIT 1');
        hasAssets = true;
      } catch {}

      let query = `
        SELECT 
          h.id,
          h.quantity,
          h.avg_price_cents,
          h.current_price_cents,
          h.market_value_cents,
          h.pnl_cents,
          h.source
      `;

      if (hasAssets) {
        query += `,
          COALESCE(a.symbol, h.asset_name_fallback) as asset_symbol,
          COALESCE(a.name, h.asset_name_fallback) as asset_name,
          a.class as asset_class`;
      } else {
        query += `,
          h.asset_name_fallback as asset_symbol,
          h.asset_name_fallback as asset_name,
          NULL as asset_class`;
      }

      query += `
         FROM holdings h
      `;

      if (hasAssets) {
        query += `LEFT JOIN assets a ON h.asset_id = a.id`;
      }

      query += `
         WHERE h.user_id = $1
         ORDER BY h.market_value_cents DESC
      `;
      
      const result = await db.query(query, [userId]);
      
      return reply.send({ holdings: result.rows });
    } catch (error: any) {
      fastify.log.error('Error fetching holdings:', error);
      // Return empty array instead of error to prevent frontend crashes
      return reply.send({ holdings: [] });
    }
  });
  
  // Get portfolio summary
  fastify.get('/summary', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      
      // Check if holdings table exists
      let hasHoldings = false;
      try {
        await db.query('SELECT 1 FROM holdings LIMIT 1');
        hasHoldings = true;
      } catch {}

      if (!hasHoldings) {
        return reply.send({ 
          summary: {
            total_value: 0,
            total_pnl: 0,
            holdings_count: 0
          }
        });
      }
      
      const result = await db.query(
        `SELECT 
          COALESCE(SUM(market_value_cents), 0) as total_value,
          COALESCE(SUM(pnl_cents), 0) as total_pnl,
          COUNT(*) as holdings_count
         FROM holdings
         WHERE user_id = $1`,
        [userId]
      );
      
      return reply.send({ summary: result.rows[0] });
    } catch (error: any) {
      fastify.log.error('Error fetching portfolio summary:', error);
      // Return default values instead of error to prevent frontend crashes
      return reply.send({ 
        summary: {
          total_value: 0,
          total_pnl: 0,
          holdings_count: 0
        }
      });
    }
  });
}
