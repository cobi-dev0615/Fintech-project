import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';

export async function cardsRoutes(fastify: FastifyInstance) {
  // Get all credit cards
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      
      const result = await db.query(
        `SELECT 
          cc.id,
          cc.display_name,
          cc.brand,
          cc.last4,
          cc.limit_cents,
          cc.currency,
          i.name as institution_name,
          i.logo_url as institution_logo
         FROM credit_cards cc
         LEFT JOIN institutions i ON cc.institution_id = i.id
         WHERE cc.user_id = $1
         ORDER BY cc.created_at DESC`,
        [userId]
      );
      
      return reply.send({ cards: result.rows });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
  
  // Get card invoices
  fastify.get('/:cardId/invoices', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { cardId } = request.params as any;
      
      const result = await db.query(
        `SELECT 
          ci.id,
          ci.period_start,
          ci.period_end,
          ci.due_date,
          ci.total_cents,
          ci.minimum_cents,
          ci.status
         FROM card_invoices ci
         WHERE ci.user_id = $1 AND ci.card_id = $2
         ORDER BY ci.period_end DESC`,
        [userId, cardId]
      );
      
      return reply.send({ invoices: result.rows });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
