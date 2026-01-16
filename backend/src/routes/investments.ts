import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';

export async function investmentsRoutes(fastify: FastifyInstance) {
  // Get all holdings
  fastify.get('/holdings', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      
      const result = await db.query(
        `SELECT 
          h.id,
          h.quantity,
          h.avg_price_cents,
          h.current_price_cents,
          h.market_value_cents,
          h.pnl_cents,
          h.source,
          COALESCE(a.symbol, h.asset_name_fallback) as asset_symbol,
          COALESCE(a.name, h.asset_name_fallback) as asset_name,
          a.class as asset_class
         FROM holdings h
         LEFT JOIN assets a ON h.asset_id = a.id
         WHERE h.user_id = $1
         ORDER BY h.market_value_cents DESC`,
        [userId]
      );
      
      return reply.send({ holdings: result.rows });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
  
  // Get portfolio summary
  fastify.get('/summary', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      
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
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
