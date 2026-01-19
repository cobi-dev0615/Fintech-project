import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';

export async function accountsRoutes(fastify: FastifyInstance) {
  // Get all bank accounts
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      
      // Check if bank_accounts table exists
      let hasBankAccounts = false;
      try {
        await db.query('SELECT 1 FROM bank_accounts LIMIT 1');
        hasBankAccounts = true;
      } catch {}

      if (!hasBankAccounts) {
        return reply.send({ accounts: [] });
      }

      // Check if institutions table exists
      let hasInstitutions = false;
      try {
        await db.query('SELECT 1 FROM institutions LIMIT 1');
        hasInstitutions = true;
      } catch {}

      let query = `
        SELECT 
          ba.id,
          ba.display_name,
          ba.account_type,
          ba.balance_cents,
          ba.currency,
          ba.last_refreshed_at
      `;

      if (hasInstitutions) {
        query += `,
          i.name as institution_name,
          i.logo_url as institution_logo`;
      } else {
        query += `,
          NULL as institution_name,
          NULL as institution_logo`;
      }

      query += `
         FROM bank_accounts ba
      `;

      if (hasInstitutions) {
        query += `LEFT JOIN institutions i ON ba.institution_id = i.id`;
      }

      query += `
         WHERE ba.user_id = $1
         ORDER BY ba.created_at DESC
      `;
      
      const result = await db.query(query, [userId]);
      
      return reply.send({ accounts: result.rows });
    } catch (error) {
      fastify.log.error(error);
      // Return empty array instead of error to prevent frontend crashes
      return reply.send({ accounts: [] });
    }
  });
  
  // Get transactions
  fastify.get('/transactions', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { accountId, limit = 50, offset = 0 } = request.query as any;
      
      // Check if transactions table exists
      let hasTransactions = false;
      try {
        await db.query('SELECT 1 FROM transactions LIMIT 1');
        hasTransactions = true;
      } catch {}

      if (!hasTransactions) {
        return reply.send({ transactions: [] });
      }

      // Check if bank_accounts table exists (for the JOIN)
      let hasBankAccounts = false;
      try {
        await db.query('SELECT 1 FROM bank_accounts LIMIT 1');
        hasBankAccounts = true;
      } catch {}

      let query = `
        SELECT 
          t.id,
          t.occurred_at,
          t.description,
          t.merchant,
          t.category,
          t.amount_cents,
          t.currency
      `;

      if (hasBankAccounts) {
        query += `,
          ba.display_name as account_name`;
      } else {
        query += `,
          NULL as account_name`;
      }

      query += `
        FROM transactions t
      `;

      if (hasBankAccounts) {
        query += `LEFT JOIN bank_accounts ba ON t.account_id = ba.id`;
      }

      query += `
        WHERE t.user_id = $1
      `;
      
      const params: any[] = [userId];
      
      if (accountId) {
        query += ' AND t.account_id = $' + (params.length + 1);
        params.push(accountId);
      }
      
      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total
        FROM transactions t
      `;
      if (hasBankAccounts) {
        countQuery += `LEFT JOIN bank_accounts ba ON t.account_id = ba.id`;
      }
      countQuery += ` WHERE t.user_id = $1`;
      const countParams: any[] = [userId];
      if (accountId) {
        countQuery += ' AND t.account_id = $' + (countParams.length + 1);
        countParams.push(accountId);
      }
      
      const countResult = await db.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0]?.total || '0', 10);
      
      query += ' ORDER BY t.occurred_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(Number(limit), Number(offset));
      
      const result = await db.query(query, params);
      
      return reply.send({ 
        transactions: result.rows,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          totalPages: Math.ceil(total / Number(limit)),
        }
      });
    } catch (error) {
      fastify.log.error(error);
      // Return empty array instead of error to prevent frontend crashes
      return reply.send({ transactions: [] });
    }
  });
}
