import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';

export async function dashboardRoutes(fastify: FastifyInstance) {
  // Get dashboard summary
  fastify.get('/summary', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      
      // Check which tables exist
      let hasBankAccounts = false;
      let hasHoldings = false;
      let hasTransactions = false;
      let hasAlerts = false;

      try {
        await db.query('SELECT 1 FROM bank_accounts LIMIT 1');
        hasBankAccounts = true;
      } catch {}

      try {
        await db.query('SELECT 1 FROM holdings LIMIT 1');
        hasHoldings = true;
      } catch {}

      try {
        await db.query('SELECT 1 FROM transactions LIMIT 1');
        hasTransactions = true;
      } catch {}

      try {
        await db.query('SELECT 1 FROM alerts LIMIT 1');
        hasAlerts = true;
      } catch {}

      // Get net worth (sum of all account balances + investment values)
      let cash_balance = 0;
      let investment_value = 0;
      let netWorth = 0;

      if (hasBankAccounts || hasHoldings) {
        try {
          let queryParts: string[] = [];
          if (hasBankAccounts) {
            queryParts.push(`SELECT balance_cents, 0 as market_value_cents FROM bank_accounts WHERE user_id = $1`);
          }
          if (hasHoldings) {
            queryParts.push(`SELECT 0 as balance_cents, market_value_cents FROM holdings WHERE user_id = $1`);
          }
          
          if (queryParts.length > 0) {
            const netWorthResult = await db.query(
              `SELECT 
                COALESCE(SUM(balance_cents), 0) as cash_balance,
                COALESCE(SUM(market_value_cents), 0) as investment_value
               FROM (${queryParts.join(' UNION ALL ')}) combined`,
              [userId]
            );
            
            cash_balance = Number(netWorthResult.rows[0]?.cash_balance || 0);
            investment_value = Number(netWorthResult.rows[0]?.investment_value || 0);
            netWorth = cash_balance + investment_value;
          }
        } catch (error) {
          fastify.log.error('Error calculating net worth:', error);
          // Use default values (0)
        }
      }
      
      // Get recent transactions count
      let recentTransactionsCount = 0;
      if (hasTransactions) {
        try {
          const transactionsResult = await db.query(
            `SELECT COUNT(*) as count FROM transactions 
             WHERE user_id = $1 AND occurred_at >= NOW() - INTERVAL '30 days'`,
            [userId]
          );
          recentTransactionsCount = Number(transactionsResult.rows[0]?.count || 0);
        } catch (error) {
          fastify.log.error('Error getting transactions count:', error);
        }
      }
      
      // Get unread alerts count
      let unreadAlertsCount = 0;
      if (hasAlerts) {
        try {
          const alertsResult = await db.query(
            `SELECT COUNT(*) as count FROM alerts 
             WHERE user_id = $1 AND is_read = false`,
            [userId]
          );
          unreadAlertsCount = Number(alertsResult.rows[0]?.count || 0);
        } catch (error) {
          fastify.log.error('Error getting alerts count:', error);
        }
      }
      
      return reply.send({
        netWorth: netWorth,
        cashBalance: cash_balance,
        investmentValue: investment_value,
        recentTransactionsCount: recentTransactionsCount,
        unreadAlertsCount: unreadAlertsCount,
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
      const monthsParam = parseInt((request.query as any)?.months || '7', 10);
      
      // Check which tables exist
      let hasBankAccounts = false;
      let hasHoldings = false;
      let hasTransactions = false;

      try {
        await db.query('SELECT 1 FROM bank_accounts LIMIT 1');
        hasBankAccounts = true;
      } catch {}

      try {
        await db.query('SELECT 1 FROM holdings LIMIT 1');
        hasHoldings = true;
      } catch {}

      try {
        await db.query('SELECT 1 FROM transactions LIMIT 1');
        hasTransactions = true;
      } catch {}

      // Get current net worth
      let currentNetWorth = 0;
      if (hasBankAccounts || hasHoldings) {
        try {
          let queryParts: string[] = [];
          if (hasBankAccounts) {
            queryParts.push(`SELECT balance_cents, 0 as market_value_cents FROM bank_accounts WHERE user_id = $1`);
          }
          if (hasHoldings) {
            queryParts.push(`SELECT 0 as balance_cents, market_value_cents FROM holdings WHERE user_id = $1`);
          }
          
          if (queryParts.length > 0) {
            const netWorthResult = await db.query(
              `SELECT 
                COALESCE(SUM(balance_cents), 0) + COALESCE(SUM(market_value_cents), 0) as net_worth
               FROM (${queryParts.join(' UNION ALL ')}) combined`,
              [userId]
            );
            currentNetWorth = Number(netWorthResult.rows[0]?.net_worth || 0);
          }
        } catch (error) {
          fastify.log.error('Error calculating current net worth:', error);
        }
      }

      // Get monthly transaction changes
      let monthlyChanges: Array<{ month: Date; change: number }> = [];
      if (hasTransactions) {
        try {
          const result = await db.query(
            `SELECT 
              DATE_TRUNC('month', occurred_at) as month,
              SUM(amount_cents) as change
             FROM transactions
             WHERE user_id = $1 
               AND occurred_at >= NOW() - INTERVAL '${monthsParam} months'
             GROUP BY DATE_TRUNC('month', occurred_at)
             ORDER BY month ASC`,
            [userId]
          );
          
          monthlyChanges = result.rows.map((row: any) => ({
            month: new Date(row.month),
            change: Number(row.change || 0),
          }));
        } catch (error) {
          fastify.log.error('Error getting monthly changes:', error);
        }
      }

      // Calculate cumulative net worth for each month
      // Start from current net worth and work backwards
      const data: Array<{ month: string; value: number }> = [];
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      
      // Generate all months in the range
      const now = new Date();
      const months: Date[] = [];
      for (let i = monthsParam - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(date);
      }

      // For each month, calculate net worth by subtracting future changes
      months.forEach((monthDate) => {
        // Sum all changes that occurred after this month
        const futureChanges = monthlyChanges
          .filter((mc) => mc.month > monthDate)
          .reduce((sum, mc) => sum + mc.change, 0);
        
        // Net worth at this month = current net worth - future changes
        const netWorthAtMonth = currentNetWorth - futureChanges;
        
        const monthName = monthNames[monthDate.getMonth()];
        data.push({
          month: monthName,
          value: Math.max(0, netWorthAtMonth / 100), // Convert cents to reais
        });
      });
      
      return reply.send({ data });
    } catch (error) {
      fastify.log.error(error);
      // Return empty array instead of error to prevent frontend crashes
      return reply.send({ data: [] });
    }
  });
}
