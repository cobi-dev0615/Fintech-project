import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';

export async function accountsRoutes(fastify: FastifyInstance) {
  // Get all bank accounts
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      
      const result = await db.query(
        `SELECT 
          ba.id,
          ba.display_name,
          ba.account_type,
          ba.balance_cents,
          ba.currency,
          ba.last_refreshed_at,
          i.name as institution_name,
          i.logo_url as institution_logo
         FROM bank_accounts ba
         LEFT JOIN institutions i ON ba.institution_id = i.id
         WHERE ba.user_id = $1
         ORDER BY ba.created_at DESC`,
        [userId]
      );
      
      return reply.send({ accounts: result.rows });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
  
  // Get transactions
  fastify.get('/transactions', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { accountId, limit = 50, offset = 0 } = request.query as any;
      
      let query = `
        SELECT 
          t.id,
          t.occurred_at,
          t.description,
          t.merchant,
          t.category,
          t.amount_cents,
          t.currency,
          ba.display_name as account_name
        FROM transactions t
        LEFT JOIN bank_accounts ba ON t.account_id = ba.id
        WHERE t.user_id = $1
      `;
      
      const params: any[] = [userId];
      
      if (accountId) {
        query += ' AND t.account_id = $2';
        params.push(accountId);
      }
      
      query += ' ORDER BY t.occurred_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(Number(limit), Number(offset));
      
      const result = await db.query(query, params);
      
      return reply.send({ transactions: result.rows });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
