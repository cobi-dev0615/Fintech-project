import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';
import { autoCategorize } from '../utils/auto-categorize.js';

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

  // ── Get full financial data for report PDF generation ─────────────────
  fastify.get('/finance', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;

      // Accounts from bank_accounts
      let accounts: any[] = [];
      try {
        const accResult = await db.query(
          `SELECT ba.id, ba.name, ba.type, ba.balance_cents AS current_balance,
                  COALESCE(oi.connector_name, '') AS institution_name
           FROM bank_accounts ba
           LEFT JOIN open_finance_items oi ON oi.id = ba.item_id
           WHERE ba.user_id = $1
           ORDER BY ba.name`,
          [userId]
        );
        accounts = accResult.rows.map((r: any) => ({
          ...r,
          current_balance: (parseInt(r.current_balance) || 0) / 100,
        }));
      } catch { /* table may not exist */ }

      // Fallback: also check pluggy_accounts if main table is empty
      if (accounts.length === 0) {
        try {
          const pluggyAccResult = await db.query(
            `SELECT pa.id, pa.name, pa.type, pa.current_balance,
                    i.name AS institution_name
             FROM pluggy_accounts pa
             LEFT JOIN connections c ON pa.item_id = c.external_consent_id
             LEFT JOIN institutions i ON c.institution_id = i.id
             WHERE pa.user_id = $1
             ORDER BY pa.name`,
            [userId]
          );
          accounts = pluggyAccResult.rows;
        } catch { /* table may not exist */ }
      }

      // Investments from holdings
      let investments: any[] = [];
      try {
        const invResult = await db.query(
          `SELECT h.id, h.type, h.name, h.market_value_cents AS current_value,
                  h.quantity, COALESCE(oi.connector_name, '') AS institution_name
           FROM holdings h
           LEFT JOIN open_finance_items oi ON oi.id = h.item_id
           WHERE h.user_id = $1
           ORDER BY h.market_value_cents DESC`,
          [userId]
        );
        investments = invResult.rows.map((r: any) => ({
          ...r,
          current_value: (parseInt(r.current_value) || 0) / 100,
        }));
      } catch { /* table may not exist */ }

      // Fallback: pluggy_investments
      if (investments.length === 0) {
        try {
          const pluggyInvResult = await db.query(
            `SELECT pi.id, pi.type, pi.name, pi.current_value,
                    pi.quantity, i.name AS institution_name
             FROM pluggy_investments pi
             LEFT JOIN connections c ON pi.item_id = c.external_consent_id
             LEFT JOIN institutions i ON c.institution_id = i.id
             WHERE pi.user_id = $1
             ORDER BY pi.current_value DESC`,
            [userId]
          );
          investments = pluggyInvResult.rows;
        } catch { /* table may not exist */ }
      }

      // Cards
      let cards: any[] = [];
      try {
        const cardsResult = await db.query(
          `SELECT c.id, c.brand, c.last4, COALESCE(oi.connector_name, '') AS institution_name, 0 AS "openDebt"
           FROM cards c
           LEFT JOIN open_finance_items oi ON oi.id = c.item_id
           WHERE c.user_id = $1`,
          [userId]
        );
        cards = cardsResult.rows;
      } catch { /* table may not exist */ }

      // Fallback: pluggy_credit_cards
      if (cards.length === 0) {
        try {
          const pluggyCardsResult = await db.query(
            `SELECT pc.id, pc.brand, pc.last4, i.name AS institution_name,
                    COALESCE(pc.balance, 0) AS "openDebt"
             FROM pluggy_credit_cards pc
             LEFT JOIN connections c ON pc.item_id = c.external_consent_id
             LEFT JOIN institutions i ON c.institution_id = i.id
             WHERE pc.user_id = $1`,
            [userId]
          );
          cards = pluggyCardsResult.rows;
        } catch { /* table may not exist */ }
      }

      // Deduplicate cards by brand + last4 (multiple connections can sync the same physical card)
      {
        const seen = new Set<string>();
        cards = cards.filter((c: any) => {
          const key = `${(c.brand || '').toLowerCase()}-${c.last4 || ''}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }

      // Transactions (recent 50)
      let transactions: any[] = [];
      try {
        const txResult = await db.query(
          `SELECT t.id, t.occurred_at AS date, t.amount_cents AS amount, t.description, t.merchant,
                  ba.name AS account_name, COALESCE(oi.connector_name, '') AS institution_name
           FROM transactions t
           LEFT JOIN bank_accounts ba ON ba.id = t.account_id
           LEFT JOIN open_finance_items oi ON oi.id = ba.item_id
           WHERE t.user_id = $1
           ORDER BY t.occurred_at DESC
           LIMIT 50`,
          [userId]
        );
        transactions = txResult.rows.map((r: any) => ({
          ...r,
          amount: (parseInt(r.amount) || 0) / 100,
        }));
      } catch { /* table may not exist */ }

      // Fallback: pluggy_transactions
      if (transactions.length === 0) {
        try {
          const pluggyTxResult = await db.query(
            `SELECT pt.id, pt.date, pt.amount, pt.description, pt.merchant,
                    pa.name AS account_name, i.name AS institution_name
             FROM pluggy_transactions pt
             LEFT JOIN pluggy_accounts pa ON pt.pluggy_account_id = pa.pluggy_account_id AND pt.user_id = pa.user_id
             LEFT JOIN connections c ON pt.item_id = c.external_consent_id
             LEFT JOIN institutions i ON c.institution_id = i.id
             WHERE pt.user_id = $1
             ORDER BY pt.date DESC
             LIMIT 50`,
            [userId]
          );
          transactions = pluggyTxResult.rows;
        } catch { /* table may not exist */ }
      }

      // Summary
      const cash = accounts.reduce((s: number, a: any) => s + (parseFloat(a.current_balance) || 0), 0);
      const investTotal = investments.reduce((s: number, i: any) => s + (parseFloat(i.current_value) || 0), 0);

      // Breakdown by investment type
      const breakdownMap: Record<string, { count: number; total: number }> = {};
      for (const inv of investments) {
        const t = inv.type || 'other';
        if (!breakdownMap[t]) breakdownMap[t] = { count: 0, total: 0 };
        breakdownMap[t].count++;
        breakdownMap[t].total += parseFloat(inv.current_value) || 0;
      }
      const breakdown = Object.entries(breakdownMap).map(([type, v]) => ({ type, ...v }));

      return reply.send({
        summary: { cash, investments: investTotal, debt: 0, netWorth: cash + investTotal },
        accounts,
        investments,
        breakdown,
        cards,
        transactions,
      });
    } catch (error) {
      fastify.log.error('Error fetching dashboard finance:', error);
      return reply.code(500).send({ error: 'Failed to load financial data' });
    }
  });

  // Spending Analytics - aggregated data for dashboard charts
  fastify.get('/spending-analytics', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const period = ((request.query as any)?.period || 'monthly') as string;

      // Validate period
      const validPeriods: Record<string, string> = {
        daily: 'day',
        weekly: 'week',
        monthly: 'month',
        yearly: 'year',
      };
      const truncUnit = validPeriods[period] || 'month';

      // Period-specific lookback for revenue vs expenses chart
      const periodLookback: Record<string, { interval: string; step: string }> = {
        day: { interval: '30 days', step: '1 day' },
        week: { interval: '12 weeks', step: '1 week' },
        month: { interval: '12 months', step: '1 month' },
        year: { interval: '5 years', step: '1 year' },
      };
      const pLookback = periodLookback[truncUnit] || periodLookback.month;

      // Determine which table has data: prefer pluggy_transactions, fallback to transactions
      let usePluggy = false;
      try {
        const check = await db.query('SELECT COUNT(*) as cnt FROM pluggy_transactions WHERE user_id = $1 LIMIT 1', [userId]);
        usePluggy = parseInt(check.rows[0]?.cnt) > 0;
      } catch { /* table may not exist */ }

      if (!usePluggy) {
        let hasTxTable = false;
        try {
          const check2 = await db.query('SELECT COUNT(*) as cnt FROM transactions WHERE user_id = $1 LIMIT 1', [userId]);
          hasTxTable = parseInt(check2.rows[0]?.cnt) > 0;
        } catch { /* table may not exist */ }

        if (!hasTxTable) {
          return reply.send({
            revenueVsExpenses: [],
            spendingByCategory: [],
            weeklyActivity: {
              totalTransactions: 0, totalSpent: 0, dailyAvg: 0,
              byDay: [], activityTrend: 0, spendingTrend: 0,
            },
            recentTransactions: [],
          });
        }
      }

      let revenueResult, categoryResult, weeklyCurrentResult, weeklyPrevResult, recentResult;

      if (usePluggy) {
        [revenueResult, categoryResult, weeklyCurrentResult, weeklyPrevResult, recentResult] = await Promise.all([
          // 1. Revenue vs Expenses grouped by period (with gap-filling via generate_series)
          db.query(
            `WITH periods AS (
              SELECT generate_series(
                DATE_TRUNC('${truncUnit}', CURRENT_DATE - INTERVAL '${pLookback.interval}'),
                DATE_TRUNC('${truncUnit}', CURRENT_DATE),
                INTERVAL '${pLookback.step}'
              )::date AS period
            )
            SELECT
              p.period,
              COALESCE(SUM(CASE WHEN pt.amount > 0 THEN pt.amount ELSE 0 END), 0)::float AS income,
              COALESCE(SUM(CASE WHEN pt.amount < 0 THEN ABS(pt.amount) ELSE 0 END), 0)::float AS expenses
            FROM periods p
            LEFT JOIN pluggy_transactions pt
              ON DATE_TRUNC('${truncUnit}', pt.date)::date = p.period
              AND pt.user_id = $1
            GROUP BY p.period
            ORDER BY p.period ASC`,
            [userId]
          ),

          // 2. Spending by category — raw rows for JS-side auto-categorize
          db.query(
            `SELECT pt.category, pt.merchant, pt.description, ABS(pt.amount)::float AS abs_amount
             FROM pluggy_transactions pt
             WHERE pt.user_id = $1
               AND pt.amount < 0
               AND pt.date >= CURRENT_DATE - INTERVAL '365 days'`,
            [userId]
          ),

          // 3. Weekly activity (current 7 days)
          db.query(
            `SELECT
              EXTRACT(DOW FROM pt.date)::int AS day_of_week,
              COUNT(*)::int AS count,
              COALESCE(SUM(ABS(pt.amount)), 0)::float AS total_spent
            FROM pluggy_transactions pt
            WHERE pt.user_id = $1
              AND pt.amount < 0
              AND pt.date >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY EXTRACT(DOW FROM pt.date)
            ORDER BY day_of_week`,
            [userId]
          ),

          // 4. Weekly activity (previous 7 days for trends)
          db.query(
            `SELECT
              COUNT(*)::int AS prev_count,
              COALESCE(SUM(ABS(pt.amount)), 0)::float AS prev_spent
            FROM pluggy_transactions pt
            WHERE pt.user_id = $1
              AND pt.amount < 0
              AND pt.date >= CURRENT_DATE - INTERVAL '14 days'
              AND pt.date < CURRENT_DATE - INTERVAL '7 days'`,
            [userId]
          ),

          // 5. Recent transactions (latest 10)
          db.query(
            `SELECT
              pt.id,
              pt.date,
              pt.amount::float AS amount,
              pt.description,
              pt.category,
              pt.merchant,
              pt.status,
              pa.name AS account_name,
              i.name AS institution_name
            FROM pluggy_transactions pt
            LEFT JOIN pluggy_accounts pa ON pt.pluggy_account_id = pa.pluggy_account_id AND pt.user_id = pa.user_id
            LEFT JOIN connections c ON pt.item_id = c.external_consent_id
            LEFT JOIN institutions i ON c.institution_id = i.id
            WHERE pt.user_id = $1
            ORDER BY pt.date DESC, pt.created_at DESC
            LIMIT 10`,
            [userId]
          ),
        ]);
      } else {
        // Fallback: query transactions table (populated by connections sync)
        [revenueResult, categoryResult, weeklyCurrentResult, weeklyPrevResult, recentResult] = await Promise.all([
          // 1. Revenue vs Expenses grouped by period (with gap-filling via generate_series)
          db.query(
            `WITH periods AS (
              SELECT generate_series(
                DATE_TRUNC('${truncUnit}', CURRENT_DATE - INTERVAL '${pLookback.interval}'),
                DATE_TRUNC('${truncUnit}', CURRENT_DATE),
                INTERVAL '${pLookback.step}'
              )::date AS period
            )
            SELECT
              p.period,
              COALESCE(SUM(CASE WHEN t.amount_cents > 0 THEN t.amount_cents::float / 100 ELSE 0 END), 0)::float AS income,
              COALESCE(SUM(CASE WHEN t.amount_cents < 0 THEN ABS(t.amount_cents::float / 100) ELSE 0 END), 0)::float AS expenses
            FROM periods p
            LEFT JOIN transactions t
              ON DATE_TRUNC('${truncUnit}', t.occurred_at)::date = p.period
              AND t.user_id = $1
            GROUP BY p.period
            ORDER BY p.period ASC`,
            [userId]
          ),

          // 2. Spending by category — raw rows for JS-side auto-categorize
          db.query(
            `SELECT t.category, t.merchant, t.description, ABS(t.amount_cents::float / 100)::float AS abs_amount
             FROM transactions t
             WHERE t.user_id = $1
               AND t.amount_cents < 0
               AND t.occurred_at >= CURRENT_DATE - INTERVAL '365 days'`,
            [userId]
          ),

          // 3. Weekly activity (current 7 days)
          db.query(
            `SELECT
              EXTRACT(DOW FROM t.occurred_at)::int AS day_of_week,
              COUNT(*)::int AS count,
              COALESCE(SUM(ABS(t.amount_cents::float / 100)), 0)::float AS total_spent
            FROM transactions t
            WHERE t.user_id = $1
              AND t.amount_cents < 0
              AND t.occurred_at >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY EXTRACT(DOW FROM t.occurred_at)
            ORDER BY day_of_week`,
            [userId]
          ),

          // 4. Weekly activity (previous 7 days for trends)
          db.query(
            `SELECT
              COUNT(*)::int AS prev_count,
              COALESCE(SUM(ABS(t.amount_cents::float / 100)), 0)::float AS prev_spent
            FROM transactions t
            WHERE t.user_id = $1
              AND t.amount_cents < 0
              AND t.occurred_at >= CURRENT_DATE - INTERVAL '14 days'
              AND t.occurred_at < CURRENT_DATE - INTERVAL '7 days'`,
            [userId]
          ),

          // 5. Recent transactions (latest 10)
          db.query(
            `SELECT
              t.id,
              t.occurred_at AS date,
              (t.amount_cents::float / 100) AS amount,
              t.description,
              t.category,
              t.merchant,
              t.status,
              ba.name AS account_name,
              i.name AS institution_name
            FROM transactions t
            LEFT JOIN bank_accounts ba ON t.account_id = ba.id
            LEFT JOIN connections c ON t.connection_id = c.id
            LEFT JOIN institutions i ON c.institution_id = i.id
            WHERE t.user_id = $1
            ORDER BY t.occurred_at DESC, t.created_at DESC
            LIMIT 10`,
            [userId]
          ),
        ]);
      }

      // Process revenue vs expenses
      const revenueVsExpenses = revenueResult.rows.map((row: any) => ({
        period: row.period,
        income: row.income,
        expenses: row.expenses,
      }));

      // Process spending by category with auto-categorization
      const categoryTotals: Record<string, number> = {};
      for (const row of categoryResult.rows) {
        const cat = row.category || autoCategorize(row.merchant, row.description) || 'Others';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + row.abs_amount;
      }
      // Sort by total desc, keep top 5, group rest into Others
      const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
      const top5 = sortedCategories.slice(0, 5);
      const othersTotal = sortedCategories.slice(5).reduce((sum, [, val]) => sum + val, 0);
      if (othersTotal > 0) {
        const existingOthers = top5.find(([cat]) => cat === 'Others');
        if (existingOthers) {
          existingOthers[1] += othersTotal;
        } else {
          top5.push(['Others', othersTotal]);
        }
      }
      const categoryGrandTotal = top5.reduce((sum, [, val]) => sum + val, 0);
      const spendingByCategory = top5.map(([category, total]) => ({
        category,
        total,
        percentage: categoryGrandTotal > 0 ? parseFloat(((total / categoryGrandTotal) * 100).toFixed(1)) : 0,
      }));

      // Process weekly activity
      const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      const dayMap = new Map(weeklyCurrentResult.rows.map((row: any) => [row.day_of_week, row]));
      const byDay = DAY_NAMES.map((day, idx) => ({
        day,
        count: (dayMap.get(idx) as any)?.count || 0,
        amount: (dayMap.get(idx) as any)?.total_spent || 0,
      }));
      const totalTransactions = byDay.reduce((s, d) => s + d.count, 0);
      const totalSpent = byDay.reduce((s, d) => s + d.amount, 0);
      const dailyAvg = totalSpent / 7;

      const prevCount = parseInt(weeklyPrevResult.rows[0]?.prev_count) || 0;
      const prevSpent = parseFloat(weeklyPrevResult.rows[0]?.prev_spent) || 0;
      const activityTrend = prevCount > 0 ? parseFloat((((totalTransactions - prevCount) / prevCount) * 100).toFixed(1)) : 0;
      const spendingTrend = prevSpent > 0 ? parseFloat((((totalSpent - prevSpent) / prevSpent) * 100).toFixed(1)) : 0;

      // Process recent transactions — same shape as /finance/transactions, with auto-categorize
      const recentTransactions = recentResult.rows.map((row: any) => ({
        id: row.id,
        date: row.date,
        amount: row.amount,
        description: row.description,
        category: row.category || autoCategorize(row.merchant, row.description),
        merchant: row.merchant || row.description || 'Unknown',
        status: row.status || 'completed',
        account_name: row.account_name,
        institution_name: row.institution_name,
      }));

      return reply.send({
        revenueVsExpenses,
        spendingByCategory,
        weeklyActivity: {
          totalTransactions,
          totalSpent: parseFloat(totalSpent.toFixed(2)),
          dailyAvg: parseFloat(dailyAvg.toFixed(2)),
          byDay,
          activityTrend,
          spendingTrend,
        },
        recentTransactions,
      });
    } catch (error) {
      fastify.log.error('Error fetching spending analytics: ' + String(error));
      return reply.code(500).send({ error: 'Failed to load spending analytics' });
    }
  });

  // Spending by Category — dedicated endpoint with period filter
  fastify.get('/spending-by-category', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const period = ((request.query as any)?.period || 'monthly') as string;

      const intervalMap: Record<string, string> = {
        weekly: '7 days',
        monthly: '30 days',
        quarterly: '90 days',
        yearly: '365 days',
      };
      const interval = intervalMap[period] || '30 days';

      // Determine which table has data
      let usePluggy = false;
      try {
        const check = await db.query('SELECT COUNT(*) as cnt FROM pluggy_transactions WHERE user_id = $1 LIMIT 1', [userId]);
        usePluggy = parseInt(check.rows[0]?.cnt) > 0;
      } catch { /* table may not exist */ }

      if (!usePluggy) {
        let hasTxTable = false;
        try {
          const check2 = await db.query('SELECT COUNT(*) as cnt FROM transactions WHERE user_id = $1 LIMIT 1', [userId]);
          hasTxTable = parseInt(check2.rows[0]?.cnt) > 0;
        } catch { /* table may not exist */ }

        if (!hasTxTable) {
          return reply.send({ spendingByCategory: [] });
        }
      }

      let categoryResult;
      if (usePluggy) {
        categoryResult = await db.query(
          `SELECT pt.category, pt.merchant, pt.description, ABS(pt.amount)::float AS abs_amount
           FROM pluggy_transactions pt
           WHERE pt.user_id = $1
             AND pt.amount < 0
             AND pt.date >= CURRENT_DATE - INTERVAL '${interval}'`,
          [userId]
        );
      } else {
        categoryResult = await db.query(
          `SELECT t.category, t.merchant, t.description, ABS(t.amount_cents::float / 100)::float AS abs_amount
           FROM transactions t
           WHERE t.user_id = $1
             AND t.amount_cents < 0
             AND t.occurred_at >= CURRENT_DATE - INTERVAL '${interval}'`,
          [userId]
        );
      }

      // JS-side auto-categorize grouping
      const categoryTotals: Record<string, number> = {};
      for (const row of categoryResult.rows) {
        const cat = row.category || autoCategorize(row.merchant, row.description) || 'Others';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + row.abs_amount;
      }

      const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
      const top5 = sortedCategories.slice(0, 5);
      const othersTotal = sortedCategories.slice(5).reduce((sum, [, val]) => sum + val, 0);
      if (othersTotal > 0) {
        const existingOthers = top5.find(([cat]) => cat === 'Others');
        if (existingOthers) {
          existingOthers[1] += othersTotal;
        } else {
          top5.push(['Others', othersTotal]);
        }
      }
      const grandTotal = top5.reduce((sum, [, val]) => sum + val, 0);
      const spendingByCategory = top5.map(([category, total]) => ({
        category,
        total,
        percentage: grandTotal > 0 ? parseFloat(((total / grandTotal) * 100).toFixed(1)) : 0,
      }));

      return reply.send({ spendingByCategory });
    } catch (error) {
      fastify.log.error('Error fetching spending by category: ' + String(error));
      return reply.code(500).send({ error: 'Failed to load spending by category' });
    }
  });
}
