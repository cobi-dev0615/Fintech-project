import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';
import { syncPluggyData } from '../services/pluggy-sync.js';

export async function financeRoutes(fastify: FastifyInstance) {
  // A) Get connected banks/items
  fastify.get('/connections', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;

      const result = await db.query(
        `SELECT 
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
        ORDER BY c.created_at DESC`,
        [userId]
      );

      return reply.send({ connections: result.rows });
    } catch (error: any) {
      fastify.log.error('Error fetching connections:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // B) Get accounts (balances)
  fastify.get('/accounts', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { itemId } = request.query as any;

      let query = `
        SELECT 
          pa.*,
          c.external_consent_id as item_id,
          i.name as institution_name,
          i.logo_url as institution_logo
        FROM pluggy_accounts pa
        LEFT JOIN connections c ON pa.item_id = c.external_consent_id
        LEFT JOIN institutions i ON c.institution_id = i.id
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

  // C) Get transactions
  fastify.get('/transactions', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { from, to, itemId, accountId, q, page = '1', limit = '50' } = request.query as any;

      let query = `
        SELECT 
          pt.*,
          pa.name as account_name,
          c.external_consent_id as item_id,
          i.name as institution_name
        FROM pluggy_transactions pt
        LEFT JOIN pluggy_accounts pa ON pt.pluggy_account_id = pa.pluggy_account_id AND pt.user_id = pa.user_id
        LEFT JOIN connections c ON pt.item_id = c.external_consent_id
        LEFT JOIN institutions i ON c.institution_id = i.id
        WHERE pt.user_id = $1
      `;
      const params: any[] = [userId];

      let paramIndex = 2;

      if (from) {
        query += ` AND pt.date >= $${paramIndex}`;
        params.push(from);
        paramIndex++;
      }

      if (to) {
        query += ` AND pt.date <= $${paramIndex}`;
        params.push(to);
        paramIndex++;
      }

      if (itemId) {
        query += ` AND pt.item_id = $${paramIndex}`;
        params.push(itemId);
        paramIndex++;
      }

      if (accountId) {
        query += ` AND pt.pluggy_account_id = $${paramIndex}`;
        params.push(accountId);
        paramIndex++;
      }

      if (q) {
        query += ` AND (pt.description ILIKE $${paramIndex} OR pt.merchant ILIKE $${paramIndex})`;
        params.push(`%${q}%`);
        paramIndex++;
      }

      // Get total count (full DB count for this user/filters, not just current page)
      // Build count query directly from WHERE conditions to avoid JOIN issues
      let countQuery = `SELECT COUNT(*) as total FROM pluggy_transactions pt WHERE pt.user_id = $1`;
      const countParams: any[] = [userId];
      let countParamIndex = 2;

      if (from) {
        countQuery += ` AND pt.date >= $${countParamIndex}`;
        countParams.push(from);
        countParamIndex++;
      }

      if (to) {
        countQuery += ` AND pt.date <= $${countParamIndex}`;
        countParams.push(to);
        countParamIndex++;
      }

      if (itemId) {
        countQuery += ` AND pt.item_id = $${countParamIndex}`;
        countParams.push(itemId);
        countParamIndex++;
      }

      if (accountId) {
        countQuery += ` AND pt.pluggy_account_id = $${countParamIndex}`;
        countParams.push(accountId);
        countParamIndex++;
      }

      if (q) {
        countQuery += ` AND (pt.description ILIKE $${countParamIndex} OR pt.merchant ILIKE $${countParamIndex})`;
        countParams.push(`%${q}%`);
        countParamIndex++;
      }

      const countResult = await db.query(countQuery, countParams);
      const total = Math.max(0, parseInt(String(countResult.rows[0]?.total ?? 0), 10));

      // Add pagination
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      query += ` ORDER BY pt.date DESC, pt.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limitNum, offset);

      const result = await db.query(query, params);

      const safeLimit = limitNum > 0 ? limitNum : 1;
      const totalPages = Math.max(1, Math.ceil(total / safeLimit));
      return reply.send({
        transactions: result.rows,
        total: total, // Top-level so clients always get DB count even if pagination shape differs
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
        },
      });
    } catch (error: any) {
      fastify.log.error('Error fetching transactions:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // D) Get investments
  fastify.get('/investments', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { itemId } = request.query as any;

      let query = `
        SELECT 
          pi.*,
          c.external_consent_id as item_id,
          i.name as institution_name,
          i.logo_url as institution_logo
        FROM pluggy_investments pi
        LEFT JOIN connections c ON pi.item_id = c.external_consent_id
        LEFT JOIN institutions i ON c.institution_id = i.id
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

  // E) Get credit cards
  fastify.get('/cards', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { itemId } = request.query as any;

      let query = `
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
          i.name as institution_name,
          i.logo_url as institution_logo,
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
        LEFT JOIN connections c ON pc.item_id = c.external_consent_id
        LEFT JOIN institutions i ON c.institution_id = i.id
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

  // F) Manual sync trigger
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
