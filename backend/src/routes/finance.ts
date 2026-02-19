import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';
import { syncPluggyData } from '../services/pluggy-sync.js';
import { autoCategorize } from '../utils/auto-categorize.js';

export async function financeRoutes(fastify: FastifyInstance) {
  // A) Get connected banks/items (deduplicated — one per institution)
  fastify.get('/connections', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;

      const result = await db.query(
        `SELECT DISTINCT ON (c.institution_id)
          c.id,
          c.external_consent_id as item_id,
          c.status,
          c.last_sync_at,
          c.last_sync_status,
          i.name as institution_name,
          i.logo_url as institution_logo
        FROM connections c
        LEFT JOIN institutions i ON c.institution_id = i.id
        WHERE c.user_id = $1 AND c.provider = 'open_finance'
        ORDER BY c.institution_id, c.created_at DESC`,
        [userId]
      );

      return reply.send({ connections: result.rows });
    } catch (error: any) {
      fastify.log.error('Error fetching connections:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // B) Get accounts (balances) — deduplicated via latest connection per institution
  fastify.get('/accounts', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { itemId } = request.query as any;

      let query = `
        WITH latest_connections AS (
          SELECT DISTINCT ON (c.institution_id)
            c.external_consent_id as item_id,
            c.institution_id,
            i.name as institution_name,
            i.logo_url as institution_logo
          FROM connections c
          LEFT JOIN institutions i ON c.institution_id = i.id
          WHERE c.user_id = $1 AND c.provider = 'open_finance'
          ORDER BY c.institution_id, c.created_at DESC
        )
        SELECT pa.*, lc.institution_name, lc.institution_logo
        FROM pluggy_accounts pa
        INNER JOIN latest_connections lc ON pa.item_id = lc.item_id
        WHERE pa.user_id = $1
      `;
      const params: any[] = [userId];

      if (itemId) {
        query += ' AND pa.item_id = $2';
        params.push(itemId);
      }

      query += ' ORDER BY pa.updated_at DESC';

      const result = await db.query(query, params);

      // Group by institution and calculate totals
      const grouped: any = {};
      let totalBalance = 0;

      for (const account of result.rows) {
        const instName = account.institution_name || 'Unknown';
        if (!grouped[instName]) {
          grouped[instName] = {
            institution_name: instName,
            institution_logo: account.institution_logo,
            accounts: [],
            total: 0,
          };
        }
        grouped[instName].accounts.push(account);
        grouped[instName].total += parseFloat(account.current_balance || 0);
        totalBalance += parseFloat(account.current_balance || 0);
      }

      return reply.send({
        accounts: result.rows,
        grouped: Object.values(grouped),
        total: totalBalance,
      });
    } catch (error: any) {
      fastify.log.error('Error fetching accounts:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // C) Get transactions — queries both tables, prefers whichever has data
  fastify.get('/transactions', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { from, to, itemId, accountId, q, page = '1', limit = '50', view } = request.query as any;

      // Determine which table has data: prefer pluggy_transactions, fallback to transactions
      let usePluggy = false;
      try {
        const check = await db.query('SELECT COUNT(*) as cnt FROM pluggy_transactions WHERE user_id = $1 LIMIT 1', [userId]);
        usePluggy = parseInt(check.rows[0]?.cnt) > 0;
      } catch { /* table may not exist */ }

      // ── Chart aggregation mode ──
      const chartModes = ['daily', 'weekly', 'monthly', 'yearly'];
      if (view && chartModes.includes(view)) {
        const dateCol = usePluggy ? 'pt.date' : 't.occurred_at';
        const table = usePluggy ? 'pluggy_transactions pt' : 'transactions t';
        const userCol = usePluggy ? 'pt.user_id' : 't.user_id';

        // Smart date defaults when no from/to provided
        let effectiveFrom = from;
        let effectiveTo = to;
        if (!effectiveFrom) {
          const now = new Date();
          switch (view) {
            case 'daily': effectiveFrom = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10); break;
            case 'weekly': effectiveFrom = new Date(now.getTime() - 84 * 86400000).toISOString().slice(0, 10); break;
            case 'monthly': effectiveFrom = new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString().slice(0, 10); break;
            // yearly: no default — all time
          }
        }
        if (!effectiveTo) {
          effectiveTo = new Date().toISOString().slice(0, 10);
        }

        const truncExpr = view === 'daily' ? dateCol : `date_trunc('${view === 'weekly' ? 'week' : view === 'monthly' ? 'month' : 'year'}', ${dateCol})`;
        const amountExpr = usePluggy ? 'pt.amount' : '(t.amount_cents::float / 100)';

        let chartQuery = `
          SELECT ${truncExpr}::date as period,
                 SUM(CASE WHEN ${amountExpr} > 0 THEN ${amountExpr} ELSE 0 END) as income,
                 SUM(CASE WHEN ${amountExpr} < 0 THEN ABS(${amountExpr}) ELSE 0 END) as expense
          FROM ${table}
          WHERE ${userCol} = $1`;
        const chartParams: any[] = [userId];
        let ci = 2;

        if (effectiveFrom) { chartQuery += ` AND ${dateCol} >= $${ci}`; chartParams.push(effectiveFrom); ci++; }
        if (effectiveTo) { chartQuery += ` AND ${dateCol} <= $${ci}`; chartParams.push(effectiveTo); ci++; }
        if (itemId) {
          const itemCol = usePluggy ? 'pt.item_id' : 'c.external_consent_id';
          if (!usePluggy) {
            chartQuery = chartQuery.replace(`FROM ${table}`, `FROM ${table} LEFT JOIN connections c ON t.connection_id = c.id`);
          }
          chartQuery += ` AND ${itemCol} = $${ci}`; chartParams.push(itemId); ci++;
        }
        if (accountId) {
          const accCol = usePluggy ? 'pt.pluggy_account_id' : 't.account_id';
          chartQuery += ` AND ${accCol} = $${ci}`; chartParams.push(accountId); ci++;
        }

        chartQuery += ` GROUP BY period ORDER BY period`;

        const chartResult = await db.query(chartQuery, chartParams);
        return reply.send({
          chartData: chartResult.rows.map((r: any) => ({
            period: r.period,
            income: parseFloat(r.income) || 0,
            expense: parseFloat(r.expense) || 0,
          })),
        });
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      if (usePluggy) {
        // ── Query pluggy_transactions ──
        let query = `
          SELECT pt.*, pa.name as account_name,
                 c.external_consent_id as item_id, i.name as institution_name
          FROM pluggy_transactions pt
          LEFT JOIN pluggy_accounts pa ON pt.pluggy_account_id = pa.pluggy_account_id AND pt.user_id = pa.user_id
          LEFT JOIN connections c ON pt.item_id = c.external_consent_id
          LEFT JOIN institutions i ON c.institution_id = i.id
          WHERE pt.user_id = $1`;
        const params: any[] = [userId];
        let idx = 2;

        if (from)      { query += ` AND pt.date >= $${idx}`; params.push(from); idx++; }
        if (to)        { query += ` AND pt.date <= $${idx}`; params.push(to); idx++; }
        if (itemId)    { query += ` AND pt.item_id = $${idx}`; params.push(itemId); idx++; }
        if (accountId) { query += ` AND pt.pluggy_account_id = $${idx}`; params.push(accountId); idx++; }
        if (q)         { query += ` AND (pt.description ILIKE $${idx} OR pt.merchant ILIKE $${idx})`; params.push(`%${q}%`); idx++; }

        let countQuery = `SELECT COUNT(*) as total FROM pluggy_transactions pt WHERE pt.user_id = $1`;
        const cp: any[] = [userId]; let ci = 2;
        if (from)      { countQuery += ` AND pt.date >= $${ci}`; cp.push(from); ci++; }
        if (to)        { countQuery += ` AND pt.date <= $${ci}`; cp.push(to); ci++; }
        if (itemId)    { countQuery += ` AND pt.item_id = $${ci}`; cp.push(itemId); ci++; }
        if (accountId) { countQuery += ` AND pt.pluggy_account_id = $${ci}`; cp.push(accountId); ci++; }
        if (q)         { countQuery += ` AND (pt.description ILIKE $${ci} OR pt.merchant ILIKE $${ci})`; cp.push(`%${q}%`); ci++; }

        const countResult = await db.query(countQuery, cp);
        const total = Math.max(0, parseInt(String(countResult.rows[0]?.total ?? 0), 10));

        query += ` ORDER BY pt.date DESC, pt.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
        params.push(limitNum, offset);
        const result = await db.query(query, params);

        const transactions = result.rows.map((tx: any) => ({
          ...tx,
          category: tx.category || autoCategorize(tx.merchant, tx.description),
        }));

        const safeLimit = limitNum > 0 ? limitNum : 1;
        return reply.send({
          transactions,
          total,
          pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.max(1, Math.ceil(total / safeLimit)) },
        });
      }

      // ── Fallback: query transactions table (populated by connections sync) ──
      let query = `
        SELECT t.id, t.occurred_at AS date, t.description, t.merchant, t.category,
               (t.amount_cents::float / 100) AS amount, t.currency, t.status,
               ba.name AS account_name, c.external_consent_id AS item_id,
               i.name AS institution_name
        FROM transactions t
        LEFT JOIN bank_accounts ba ON t.account_id = ba.id
        LEFT JOIN connections c ON t.connection_id = c.id
        LEFT JOIN institutions i ON c.institution_id = i.id
        WHERE t.user_id = $1`;
      const params: any[] = [userId];
      let idx = 2;

      if (from)      { query += ` AND t.occurred_at >= $${idx}`; params.push(from); idx++; }
      if (to)        { query += ` AND t.occurred_at <= $${idx}`; params.push(to); idx++; }
      if (itemId)    { query += ` AND c.external_consent_id = $${idx}`; params.push(itemId); idx++; }
      if (accountId) { query += ` AND t.account_id = $${idx}`; params.push(accountId); idx++; }
      if (q)         { query += ` AND (t.description ILIKE $${idx} OR t.merchant ILIKE $${idx})`; params.push(`%${q}%`); idx++; }

      let countQuery = `SELECT COUNT(*) as total FROM transactions t WHERE t.user_id = $1`;
      const cp: any[] = [userId]; let ci = 2;
      if (from)      { countQuery += ` AND t.occurred_at >= $${ci}`; cp.push(from); ci++; }
      if (to)        { countQuery += ` AND t.occurred_at <= $${ci}`; cp.push(to); ci++; }
      if (q)         { countQuery += ` AND (t.description ILIKE $${ci} OR t.merchant ILIKE $${ci})`; cp.push(`%${q}%`); ci++; }

      const countResult = await db.query(countQuery, cp);
      const total = Math.max(0, parseInt(String(countResult.rows[0]?.total ?? 0), 10));

      query += ` ORDER BY t.occurred_at DESC, t.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
      params.push(limitNum, offset);
      const result = await db.query(query, params);

      const transactions = result.rows.map((tx: any) => ({
        ...tx,
        category: tx.category || autoCategorize(tx.merchant, tx.description),
        status: tx.status || 'completed',
      }));

      const safeLimit = limitNum > 0 ? limitNum : 1;
      return reply.send({
        transactions,
        total,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.max(1, Math.ceil(total / safeLimit)) },
      });
    } catch (error: any) {
      fastify.log.error('Error fetching transactions:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // C2) Update transaction category
  fastify.patch('/transactions/:id/category', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { id } = request.params as any;
      const { category } = request.body as any;

      if (!category || typeof category !== 'string') {
        return reply.code(400).send({ error: 'Category is required' });
      }

      // Try pluggy_transactions first, then fallback to transactions table
      let result;
      try {
        result = await db.query(
          `UPDATE pluggy_transactions
           SET category = $1, category_is_manual = true
           WHERE id = $2 AND user_id = $3
           RETURNING id, category`,
          [category, id, userId]
        );
      } catch { /* table may not exist */ }

      if (!result || result.rows.length === 0) {
        try {
          result = await db.query(
            `UPDATE transactions
             SET category = $1
             WHERE id = $2 AND user_id = $3
             RETURNING id, category`,
            [category, id, userId]
          );
        } catch { /* table may not exist */ }
      }

      if (!result || result.rows.length === 0) {
        return reply.code(404).send({ error: 'Transaction not found' });
      }

      return reply.send({ success: true, transaction: result.rows[0] });
    } catch (error: any) {
      fastify.log.error('Error updating transaction category: ' + String(error));
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // D) Get investments — deduplicated via latest connection per institution
  fastify.get('/investments', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { itemId } = request.query as any;

      let query = `
        WITH latest_connections AS (
          SELECT DISTINCT ON (c.institution_id)
            c.external_consent_id as item_id,
            c.institution_id,
            i.name as institution_name,
            i.logo_url as institution_logo
          FROM connections c
          LEFT JOIN institutions i ON c.institution_id = i.id
          WHERE c.user_id = $1 AND c.provider = 'open_finance'
          ORDER BY c.institution_id, c.created_at DESC
        )
        SELECT pi.*, lc.institution_name, lc.institution_logo
        FROM pluggy_investments pi
        INNER JOIN latest_connections lc ON pi.item_id = lc.item_id
        WHERE pi.user_id = $1
      `;
      const params: any[] = [userId];

      if (itemId) {
        query += ' AND pi.item_id = $2';
        params.push(itemId);
      }

      query += ' ORDER BY pi.updated_at DESC';

      const result = await db.query(query, params);

      // Calculate totals and breakdown by type
      let totalValue = 0;
      const byType: any = {};

      for (const inv of result.rows) {
        const value = parseFloat(inv.current_value || 0);
        totalValue += value;

        const type = inv.type || 'other';
        if (!byType[type]) {
          byType[type] = { type, count: 0, total: 0 };
        }
        byType[type].count++;
        byType[type].total += value;
      }

      return reply.send({
        investments: result.rows,
        total: totalValue,
        breakdown: Object.values(byType),
      });
    } catch (error: any) {
      fastify.log.error('Error fetching investments:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // E) Get credit cards — deduplicated via latest connection per institution
  fastify.get('/cards', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { itemId } = request.query as any;

      let query = `
        WITH latest_connections AS (
          SELECT DISTINCT ON (c.institution_id)
            c.external_consent_id as item_id,
            c.institution_id,
            i.name as institution_name,
            i.logo_url as institution_logo
          FROM connections c
          LEFT JOIN institutions i ON c.institution_id = i.id
          WHERE c.user_id = $1 AND c.provider = 'open_finance'
          ORDER BY c.institution_id, c.created_at DESC
        )
        SELECT
          pc.id,
          pc.user_id,
          pc.item_id,
          pc.pluggy_card_id,
          pc.brand,
          pc.last4,
          pc."limit",
          pc.available_limit,
          pc.balance,
          pc.updated_at,
          lc.institution_name,
          lc.institution_logo,
          (CASE WHEN lc.institution_name IS NULL THEN 'bank'
                WHEN lc.institution_name ILIKE ANY(ARRAY['%XP%','%BTG%','%Ágora%','%Rico%','%Clear%','%Easynvest%','%Genial%','%Modal%','%Nu invest%','%Warren%','%Órama%','%Guide%','%Toro%','%Ativa%','%Safra%','%Investimentos%','%Corretora%','%Securitizadora%']) THEN 'broker'
                ELSE 'bank' END) as institution_type,
          (
            SELECT json_build_object(
              'id', pci.id,
              'pluggy_invoice_id', pci.pluggy_invoice_id,
              'due_date', pci.due_date,
              'amount', pci.amount,
              'status', pci.status
            )
            FROM pluggy_card_invoices pci
            WHERE pci.pluggy_card_id = pc.pluggy_card_id
              AND pci.user_id = pc.user_id
            ORDER BY pci.due_date DESC
            LIMIT 1
          ) as latest_invoice
        FROM pluggy_credit_cards pc
        INNER JOIN latest_connections lc ON pc.item_id = lc.item_id
        WHERE pc.user_id = $1
      `;
      const params: any[] = [userId];

      if (itemId) {
        query += ' AND pc.item_id = $2';
        params.push(itemId);
      }

      query += ' ORDER BY pc.updated_at DESC';

      const result = await db.query(query, params);

      return reply.send({ cards: result.rows });
    } catch (error: any) {
      fastify.log.error('Error fetching credit cards:', error);
      fastify.log.error('Error details:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
      });
      return reply.code(500).send({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // F) Net worth evolution (asset change over time) for dashboard chart
  fastify.get('/net-worth-evolution', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const period = ((request.query as any)?.period || 'monthly') as string;
      // Legacy support: also accept ?months= param
      const legacyMonths = (request.query as any)?.months;

      // Period config: truncation unit, lookback interval, number of data points
      const periodConfig: Record<string, { trunc: string; interval: string; points: number; labelFn: (d: Date) => string }> = {
        daily: {
          trunc: 'day', interval: '30 days', points: 30,
          labelFn: (d) => d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        },
        weekly: {
          trunc: 'week', interval: '12 weeks', points: 12,
          labelFn: (d) => d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        },
        monthly: {
          trunc: 'month', interval: '12 months', points: 12,
          labelFn: (d) => {
            const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            return `${names[d.getMonth()]} ${d.getFullYear()}`;
          },
        },
        yearly: {
          trunc: 'year', interval: '5 years', points: 5,
          labelFn: (d) => d.getFullYear().toString(),
        },
      };

      const config = periodConfig[period] || periodConfig.monthly;

      // Override with legacy months param if provided and no period param
      if (legacyMonths && !(request.query as any)?.period) {
        const m = Math.min(24, Math.max(1, parseInt(legacyMonths, 10)));
        config.interval = `${m} months`;
        config.points = m;
        config.trunc = 'month';
        const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        config.labelFn = (d) => `${names[d.getMonth()]} ${d.getFullYear()}`;
      }

      // Current total balance from pluggy_accounts (reais)
      let currentBalance = 0;
      const balanceResult = await db.query(
        `SELECT COALESCE(SUM(current_balance), 0)::float as total
         FROM pluggy_accounts WHERE user_id = $1`,
        [userId]
      );
      currentBalance = parseFloat(balanceResult.rows[0]?.total || '0') || 0;

      // Current investments total from pluggy_investments (reais)
      let currentInvestments = 0;
      const invResult = await db.query(
        `SELECT COALESCE(SUM(current_value), 0)::float as total
         FROM pluggy_investments WHERE user_id = $1`,
        [userId]
      );
      currentInvestments = parseFloat(invResult.rows[0]?.total || '0') || 0;

      const currentNetWorth = currentBalance + currentInvestments;

      // Transaction changes grouped by period
      const changesResult = await db.query(
        `SELECT
           DATE_TRUNC('${config.trunc}', pt.date)::date as period_start,
           COALESCE(SUM(pt.amount), 0)::float as change
         FROM pluggy_transactions pt
         WHERE pt.user_id = $1
           AND pt.date >= CURRENT_DATE - INTERVAL '${config.interval}'
         GROUP BY DATE_TRUNC('${config.trunc}', pt.date)
         ORDER BY period_start ASC`,
        [userId]
      );

      const changes: Array<{ period_start: Date; change: number }> = (changesResult.rows || []).map((row: any) => ({
        period_start: new Date(row.period_start),
        change: parseFloat(row.change || '0') || 0,
      }));

      // Generate data points by walking backwards from now
      const data: Array<{ month: string; value: number }> = [];
      const now = new Date();

      // Build period start dates
      const periodDates: Date[] = [];
      for (let i = config.points - 1; i >= 0; i--) {
        let d: Date;
        if (config.trunc === 'day') {
          d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        } else if (config.trunc === 'week') {
          d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7);
        } else if (config.trunc === 'year') {
          d = new Date(now.getFullYear() - i, 0, 1);
        } else {
          d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        }
        periodDates.push(d);
      }

      for (const periodDate of periodDates) {
        const futureChange = changes
          .filter((c) => c.period_start > periodDate)
          .reduce((sum, c) => sum + c.change, 0);
        const netWorthAtPeriod = currentNetWorth - futureChange;
        data.push({
          month: config.labelFn(periodDate),
          value: Math.round(netWorthAtPeriod * 100) / 100,
        });
      }

      return reply.send({ data });
    } catch (error: any) {
      fastify.log.error('Error fetching net worth evolution:', error);
      return reply.send({ data: [] });
    }
  });

  // G) Manual sync trigger
  fastify.post('/sync', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { itemId } = request.body as any;

      // Rate limiting: Check last sync time (prevent too frequent syncs)
      if (itemId) {
        const lastSync = await db.query(
          `SELECT last_sync_at FROM connections 
           WHERE user_id = $1 AND external_consent_id = $2`,
          [userId, itemId]
        );

        if (lastSync.rows.length > 0 && lastSync.rows[0].last_sync_at) {
          const lastSyncTime = new Date(lastSync.rows[0].last_sync_at);
          const now = new Date();
          const minutesSinceSync = (now.getTime() - lastSyncTime.getTime()) / 1000 / 60;

          if (minutesSinceSync < 5) {
            return reply.code(429).send({
              error: 'Rate limit exceeded',
              message: 'Please wait before syncing again. Minimum 5 minutes between syncs.',
            });
          }
        }

        // Sync specific item
        await syncPluggyData(userId, itemId);

        // Update connection sync status
        await db.query(
          `UPDATE connections 
           SET last_sync_at = NOW(), last_sync_status = 'ok', updated_at = NOW()
           WHERE user_id = $1 AND external_consent_id = $2`,
          [userId, itemId]
        );
      } else {
        // Sync all items for user
        const connections = await db.query(
          `SELECT external_consent_id FROM connections 
           WHERE user_id = $1 AND external_consent_id IS NOT NULL AND status = 'connected'`,
          [userId]
        );

        for (const conn of connections.rows) {
          try {
            await syncPluggyData(userId, conn.external_consent_id);
          } catch (error: any) {
            fastify.log.error(`Error syncing item ${conn.external_consent_id}:`, error);
          }
        }

        // Update all connections
        await db.query(
          `UPDATE connections 
           SET last_sync_at = NOW(), last_sync_status = 'ok', updated_at = NOW()
           WHERE user_id = $1`,
          [userId]
        );
      }

      return reply.send({ success: true, message: 'Sync completed' });
    } catch (error: any) {
      fastify.log.error('Error syncing data:', error);
      return reply.code(500).send({ error: 'Internal server error', details: error.message });
    }
  });
}
