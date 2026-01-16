import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';

export async function dashboardRoutes(fastify: FastifyInstance) {
  // Get dashboard summary
  fastify.get('/summary', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      
      // Get net worth (sum of all account balances + investment values)
      const netWorthResult = await db.query(
        `SELECT 
          COALESCE(SUM(balance_cents), 0) as cash_balance,
          COALESCE(SUM(market_value_cents), 0) as investment_value
         FROM (
           SELECT balance_cents, 0 as market_value_cents FROM bank_accounts WHERE user_id = $1
           UNION ALL
           SELECT 0 as balance_cents, market_value_cents FROM holdings WHERE user_id = $1
         ) combined`,
        [userId]
      );
      
      const { cash_balance, investment_value } = netWorthResult.rows[0];
      const netWorth = Number(cash_balance) + Number(investment_value);
      
      // Get recent transactions count
      const transactionsResult = await db.query(
        `SELECT COUNT(*) as count FROM transactions 
         WHERE user_id = $1 AND occurred_at >= NOW() - INTERVAL '30 days'`,
        [userId]
      );
      
      // Get unread alerts count
      const alertsResult = await db.query(
        `SELECT COUNT(*) as count FROM alerts 
         WHERE user_id = $1 AND is_read = false`,
        [userId]
      );
      
      return reply.send({
        netWorth: netWorth,
        cashBalance: Number(cash_balance),
        investmentValue: Number(investment_value),
        recentTransactionsCount: Number(transactionsResult.rows[0].count),
        unreadAlertsCount: Number(alertsResult.rows[0].count),
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
  
  // Get net worth evolution
  fastify.get('/net-worth-evolution', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { months = 6 } = request.query as any;
      
      // This is a simplified version - in production, you'd calculate historical snapshots
      const result = await db.query(
        `SELECT 
          DATE_TRUNC('month', occurred_at) as month,
          SUM(amount_cents) as change
         FROM transactions
         WHERE user_id = $1 
           AND occurred_at >= NOW() - INTERVAL '${months} months'
         GROUP BY DATE_TRUNC('month', occurred_at)
         ORDER BY month ASC`,
        [userId]
      );
      
      return reply.send({ data: result.rows });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
