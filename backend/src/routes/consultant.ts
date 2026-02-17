import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fs from 'fs';
import path from 'path';
import { db } from '../db/connection.js';
import { cache } from '../utils/cache.js';
import { createAlert } from '../utils/notifications.js';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'messages');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXT = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'txt', 'csv']);

export async function consultantRoutes(fastify: FastifyInstance) {
  // Middleware: Only consultants can access these routes
  const requireConsultant = async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
      if ((request.user as any).role !== 'consultant') {
        reply.code(403).send({ error: 'Access denied. Consultant role required.' });
        return;
      }
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized', details: (err as any).message });
      return;
    }
  };

  const getConsultantId = (request: any): string => {
    return (request.user as any).userId ?? (request.user as any).id;
  };

  // Health check
  fastify.get('/', async (_request, reply) => {
    return reply.send({ message: 'Consultant API', status: 'ok' });
  });

  // ── Dashboard Metrics ────────────────────────────────────────────────
  fastify.get('/dashboard/metrics', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const cacheKey = `consultant:${consultantId}:dashboard:metrics`;

      const cachedData = cache.get(cacheKey);
      if (cachedData) return cachedData;

      // ── KPIs ─────────────────────────────────────────────────────────

      // Total active clients
      let totalClients = 0;
      let newClients = 0;
      try {
        const clientsResult = await db.query(
          `SELECT
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE cc.created_at >= DATE_TRUNC('month', CURRENT_DATE)) AS new_this_month
           FROM customer_consultants cc
           WHERE cc.consultant_id = $1
             AND cc.status = 'active'`,
          [consultantId]
        );
        totalClients = parseInt(clientsResult.rows[0].total) || 0;
        newClients = parseInt(clientsResult.rows[0].new_this_month) || 0;
      } catch { /* table may not exist yet */ }

      // Total net worth under management (cash + investments from linked clients)
      let totalNetWorth = 0;
      try {
        const nwResult = await db.query(
          `SELECT
             COALESCE(SUM(ba.balance_cents), 0) +
             COALESCE((
               SELECT SUM(h.market_value_cents)
               FROM holdings h
               WHERE h.user_id IN (
                 SELECT cc2.customer_id FROM customer_consultants cc2
                 WHERE cc2.consultant_id = $1 AND cc2.status = 'active'
               )
             ), 0) AS net_cents
           FROM bank_accounts ba
           WHERE ba.user_id IN (
             SELECT cc.customer_id FROM customer_consultants cc
             WHERE cc.consultant_id = $1 AND cc.status = 'active'
           )`,
          [consultantId]
        );
        totalNetWorth = (parseInt(nwResult.rows[0].net_cents) || 0) / 100;
      } catch { /* tables may not exist yet */ }

      // Pending tasks
      let pendingTasks = 0;
      try {
        const tasksCount = await db.query(
          `SELECT COUNT(*) AS count
           FROM tasks
           WHERE consultant_id = $1 AND is_done = FALSE`,
          [consultantId]
        );
        pendingTasks = parseInt(tasksCount.rows[0].count) || 0;
      } catch { /* table may not exist yet */ }

      // Prospects (leads in pipeline, excluding won/lost)
      let prospects = 0;
      try {
        const prospectsResult = await db.query(
          `SELECT COUNT(*) AS count
           FROM crm_leads
           WHERE consultant_id = $1
             AND stage NOT IN ('won', 'lost')`,
          [consultantId]
        );
        prospects = parseInt(prospectsResult.rows[0].count) || 0;
      } catch { /* table may not exist yet */ }

      // ── Pipeline breakdown by stage ──────────────────────────────────
      let pipeline: Array<{ stage: string; count: number }> = [];
      try {
        const pipelineResult = await db.query(
          `SELECT stage, COUNT(*) AS count
           FROM crm_leads
           WHERE consultant_id = $1
           GROUP BY stage
           ORDER BY CASE stage
             WHEN 'lead' THEN 1
             WHEN 'contacted' THEN 2
             WHEN 'meeting' THEN 3
             WHEN 'proposal' THEN 4
             WHEN 'won' THEN 5
             WHEN 'lost' THEN 6
           END`,
          [consultantId]
        );
        pipeline = pipelineResult.rows.map((r: any) => ({
          stage: r.stage,
          count: parseInt(r.count) || 0,
        }));
      } catch { /* table may not exist yet */ }

      // ── Recent tasks ─────────────────────────────────────────────────
      let recentTasks: Array<{
        id: string;
        task: string;
        client: string;
        dueDate: string;
        priority: string;
      }> = [];
      try {
        const tasksResult = await db.query(
          `SELECT t.id, t.title, t.due_at,
                  COALESCE(u.full_name, u.email, 'N/A') AS client_name
           FROM tasks t
           LEFT JOIN users u ON u.id = t.customer_id
           WHERE t.consultant_id = $1 AND t.is_done = FALSE
           ORDER BY t.due_at ASC NULLS LAST
           LIMIT 10`,
          [consultantId]
        );
        const now = new Date();
        recentTasks = tasksResult.rows.map((r: any) => {
          const dueDate = r.due_at ? new Date(r.due_at) : null;
          let priority = 'low';
          if (dueDate) {
            const diffDays = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
            if (diffDays < 0) priority = 'high';
            else if (diffDays <= 3) priority = 'medium';
          }
          return {
            id: r.id,
            task: r.title,
            client: r.client_name,
            dueDate: dueDate ? dueDate.toISOString().slice(0, 10) : '',
            priority,
          };
        });
      } catch { /* table may not exist yet */ }

      const result = {
        kpis: {
          totalClients,
          newClients,
          totalNetWorth,
          pendingTasks,
          prospects,
        },
        pipeline,
        recentTasks,
      };

      cache.set(cacheKey, result, 120000); // 2 minute TTL
      return result;
    } catch (err) {
      fastify.log.error('Consultant dashboard metrics error:', err);
      reply.code(500).send({ error: 'Failed to load dashboard metrics' });
    }
  });

  // ── List Clients ──────────────────────────────────────────────────────
  fastify.get('/clients', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const query = request.query as { page?: string; limit?: string; search?: string; status?: string };

      const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(query.limit || '10', 10) || 10));
      const offset = (page - 1) * limit;
      const search = query.search?.trim() || '';
      const statusFilter = query.status?.trim().toLowerCase() || '';

      const conditions: string[] = ['cc.consultant_id = $1'];
      const params: any[] = [consultantId];
      let paramIdx = 2;

      if (statusFilter) {
        conditions.push(`cc.status = $${paramIdx}`);
        params.push(statusFilter);
        paramIdx++;
      }

      if (search) {
        conditions.push(`(u.full_name ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx})`);
        params.push(`%${search}%`);
        paramIdx++;
      }

      const whereClause = conditions.join(' AND ');

      // Total count
      const countResult = await db.query(
        `SELECT COUNT(*) AS total
         FROM customer_consultants cc
         JOIN users u ON u.id = cc.customer_id
         WHERE ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].total) || 0;

      // Fetch clients
      const clientsResult = await db.query(
        `SELECT
           cc.customer_id AS id,
           COALESCE(u.full_name, u.email) AS name,
           u.email,
           cc.status,
           cc.can_view_all AS wallet_shared,
           cc.updated_at AS last_contact,
           COALESCE((
             SELECT SUM(ba.balance_cents)
             FROM bank_accounts ba
             WHERE ba.user_id = cc.customer_id
           ), 0) +
           COALESCE((
             SELECT SUM(h.market_value_cents)
             FROM holdings h
             WHERE h.user_id = cc.customer_id
           ), 0) AS net_worth_cents
         FROM customer_consultants cc
         JOIN users u ON u.id = cc.customer_id
         WHERE ${whereClause}
         ORDER BY cc.created_at DESC
         LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, limit, offset]
      );

      const clients = clientsResult.rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        netWorth: (parseInt(r.net_worth_cents) || 0) / 100,
        status: r.status,
        lastContact: r.last_contact ? new Date(r.last_contact).toISOString() : '',
        walletShared: r.wallet_shared ?? true,
      }));

      return {
        clients,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (err) {
      fastify.log.error(`Consultant list clients error: ${err}`);
      reply.code(500).send({ error: 'Failed to load clients' });
    }
  });

  // ── Get Single Client ─────────────────────────────────────────────────
  fastify.get('/clients/:id', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const { id } = request.params as { id: string };

      // Verify consultant-client relationship
      const linkResult = await db.query(
        `SELECT cc.status, cc.can_view_all
         FROM customer_consultants cc
         WHERE cc.consultant_id = $1 AND cc.customer_id = $2`,
        [consultantId, id]
      );

      if (linkResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Client not found' });
      }

      const link = linkResult.rows[0];

      // Fetch client info
      const userResult = await db.query(
        `SELECT id, full_name AS name, email, phone, birth_date, risk_profile, created_at
         FROM users WHERE id = $1`,
        [id]
      );

      if (userResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Client not found' });
      }

      const u = userResult.rows[0];

      // Financial summary
      let financial = null;
      try {
        const cashResult = await db.query(
          `SELECT COALESCE(SUM(balance_cents), 0) AS total FROM bank_accounts WHERE user_id = $1`,
          [id]
        );
        const investResult = await db.query(
          `SELECT COALESCE(SUM(market_value_cents), 0) AS total FROM holdings WHERE user_id = $1`,
          [id]
        );
        const cash = (parseInt(cashResult.rows[0].total) || 0) / 100;
        const investments = (parseInt(investResult.rows[0].total) || 0) / 100;
        financial = { netWorth: cash + investments, cash, investments, debt: 0 };
      } catch { /* tables may not exist */ }

      // Notes
      let notes: Array<{ id: string; content: string; date: string }> = [];
      try {
        const notesResult = await db.query(
          `SELECT id, note AS content, created_at AS date
           FROM client_notes
           WHERE consultant_id = $1 AND customer_id = $2
           ORDER BY created_at DESC`,
          [consultantId, id]
        );
        notes = notesResult.rows.map((r: any) => ({
          id: r.id,
          content: r.content,
          date: new Date(r.date).toISOString(),
        }));
      } catch { /* table may not exist */ }

      return {
        client: {
          id: u.id,
          name: u.name || u.email,
          email: u.email,
          phone: u.phone || null,
          birthDate: u.birth_date ? new Date(u.birth_date).toISOString().slice(0, 10) : null,
          riskProfile: u.risk_profile || null,
          createdAt: new Date(u.created_at).toISOString(),
        },
        walletShared: link.can_view_all ?? true,
        financial,
        notes,
        reports: [],
      };
    } catch (err) {
      fastify.log.error(`Consultant get client error: ${err}`);
      reply.code(500).send({ error: 'Failed to load client details' });
    }
  });

  // ── Get Client Finance ─────────────────────────────────────────────────
  fastify.get('/clients/:clientId/finance', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const { clientId } = request.params as { clientId: string };

      // Verify relationship & permission
      const linkResult = await db.query(
        `SELECT can_view_all FROM customer_consultants
         WHERE consultant_id = $1 AND customer_id = $2 AND status = 'active'`,
        [consultantId, clientId]
      );

      if (linkResult.rows.length === 0) {
        return reply.code(403).send({ error: 'Access denied or client not found' });
      }

      // User info
      const userResult = await db.query(
        `SELECT id, full_name AS name, email FROM users WHERE id = $1`,
        [clientId]
      );
      const user = userResult.rows[0] || { id: clientId, name: '', email: '' };

      // Accounts
      let accounts: any[] = [];
      try {
        const accResult = await db.query(
          `SELECT ba.id, ba.name, ba.type, ba.balance_cents AS current_balance,
                  COALESCE(oi.connector_name, '') AS institution_name
           FROM bank_accounts ba
           LEFT JOIN open_finance_items oi ON oi.id = ba.item_id
           WHERE ba.user_id = $1
           ORDER BY ba.name`,
          [clientId]
        );
        accounts = accResult.rows.map((r: any) => ({
          ...r,
          current_balance: (parseInt(r.current_balance) || 0) / 100,
        }));
      } catch { /* table may not exist */ }

      // Investments / holdings
      let investments: any[] = [];
      try {
        const invResult = await db.query(
          `SELECT h.id, h.type, h.name, h.market_value_cents AS current_value,
                  h.quantity, COALESCE(oi.connector_name, '') AS institution_name
           FROM holdings h
           LEFT JOIN open_finance_items oi ON oi.id = h.item_id
           WHERE h.user_id = $1
           ORDER BY h.market_value_cents DESC`,
          [clientId]
        );
        investments = invResult.rows.map((r: any) => ({
          ...r,
          current_value: (parseInt(r.current_value) || 0) / 100,
        }));
      } catch { /* table may not exist */ }

      // Connections
      let connections: any[] = [];
      try {
        const connResult = await db.query(
          `SELECT id, item_id, status, connector_name AS institution_name, connector_logo AS institution_logo
           FROM open_finance_items WHERE user_id = $1`,
          [clientId]
        );
        connections = connResult.rows;
      } catch { /* table may not exist */ }

      // Cards
      let cards: any[] = [];
      try {
        const cardsResult = await db.query(
          `SELECT c.id, c.brand, c.last4, COALESCE(oi.connector_name, '') AS institution_name, 0 AS "openDebt"
           FROM cards c
           LEFT JOIN open_finance_items oi ON oi.id = c.item_id
           WHERE c.user_id = $1`,
          [clientId]
        );
        cards = cardsResult.rows;
      } catch { /* table may not exist */ }

      // Transactions (recent 50)
      let transactions: any[] = [];
      try {
        const txResult = await db.query(
          `SELECT t.id, t.date, t.amount_cents AS amount, t.description, t.merchant,
                  ba.name AS account_name, COALESCE(oi.connector_name, '') AS institution_name
           FROM transactions t
           LEFT JOIN bank_accounts ba ON ba.id = t.account_id
           LEFT JOIN open_finance_items oi ON oi.id = ba.item_id
           WHERE t.user_id = $1
           ORDER BY t.date DESC
           LIMIT 50`,
          [clientId]
        );
        transactions = txResult.rows.map((r: any) => ({
          ...r,
          amount: (parseInt(r.amount) || 0) / 100,
        }));
      } catch { /* table may not exist */ }

      // Summary
      const cash = accounts.reduce((s: number, a: any) => s + (a.current_balance || 0), 0);
      const investTotal = investments.reduce((s: number, i: any) => s + (i.current_value || 0), 0);

      // Breakdown by investment type
      const breakdownMap: Record<string, { count: number; total: number }> = {};
      for (const inv of investments) {
        const t = inv.type || 'other';
        if (!breakdownMap[t]) breakdownMap[t] = { count: 0, total: 0 };
        breakdownMap[t].count++;
        breakdownMap[t].total += inv.current_value || 0;
      }
      const breakdown = Object.entries(breakdownMap).map(([type, v]) => ({ type, ...v }));

      return {
        user: { id: user.id, name: user.name || user.email, email: user.email },
        summary: { cash, investments: investTotal, debt: 0, netWorth: cash + investTotal },
        connections,
        accounts,
        investments,
        breakdown,
        cards,
        transactions,
      };
    } catch (err) {
      fastify.log.error(`Consultant get client finance error: ${err}`);
      reply.code(500).send({ error: 'Failed to load client financial data' });
    }
  });

  // ── Unlink Client ──────────────────────────────────────────────────────
  fastify.delete('/clients/:clientId', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const { clientId } = request.params as { clientId: string };

      const result = await db.query(
        `DELETE FROM customer_consultants
         WHERE consultant_id = $1 AND customer_id = $2
         RETURNING id`,
        [consultantId, clientId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Client relationship not found' });
      }

      // Clear related caches
      cache.delete(`consultant:${consultantId}:dashboard:metrics`);

      return { message: 'Client unlinked successfully' };
    } catch (err) {
      fastify.log.error(`Consultant unlink client error: ${err}`);
      reply.code(500).send({ error: 'Failed to unlink client' });
    }
  });

  // ── Add Client Note ────────────────────────────────────────────────────
  fastify.post('/clients/:clientId/notes', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const { clientId } = request.params as { clientId: string };
      const { note } = request.body as { note: string };

      if (!note || !note.trim()) {
        return reply.code(400).send({ error: 'Note content is required' });
      }

      // Verify relationship exists
      const linkResult = await db.query(
        `SELECT id FROM customer_consultants
         WHERE consultant_id = $1 AND customer_id = $2`,
        [consultantId, clientId]
      );

      if (linkResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Client not found' });
      }

      const result = await db.query(
        `INSERT INTO client_notes (consultant_id, customer_id, note)
         VALUES ($1, $2, $3)
         RETURNING id, note AS content, created_at AS date`,
        [consultantId, clientId, note.trim()]
      );

      const row = result.rows[0];
      return {
        note: {
          id: row.id,
          content: row.content,
          date: new Date(row.date).toISOString(),
        },
      };
    } catch (err) {
      fastify.log.error(`Consultant add note error: ${err}`);
      reply.code(500).send({ error: 'Failed to add note' });
    }
  });

  // ── Delete Client Note ─────────────────────────────────────────────────
  fastify.delete('/clients/:clientId/notes/:noteId', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const { clientId, noteId } = request.params as { clientId: string; noteId: string };

      const result = await db.query(
        `DELETE FROM client_notes
         WHERE id = $1 AND consultant_id = $2 AND customer_id = $3
         RETURNING id`,
        [noteId, consultantId, clientId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Note not found' });
      }

      return { message: 'Note deleted successfully' };
    } catch (err) {
      fastify.log.error(`Consultant delete note error: ${err}`);
      reply.code(500).send({ error: 'Failed to delete note' });
    }
  });

  // ── Available Customers (for invitation search) ────────────────────────
  fastify.get('/invitations/available-customers', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const { search } = request.query as { search?: string };
      const searchTerm = search?.trim() || '';

      // Find customers with role 'customer' who are NOT already linked to this consultant
      let searchCondition = '';
      const params: any[] = [consultantId];

      if (searchTerm) {
        searchCondition = `AND (u.full_name ILIKE $2 OR u.email ILIKE $2)`;
        params.push(`%${searchTerm}%`);
      }

      const result = await db.query(
        `SELECT u.id, u.email, u.full_name AS name
         FROM users u
         WHERE u.role = 'customer'
           AND u.id NOT IN (
             SELECT cc.customer_id FROM customer_consultants cc
             WHERE cc.consultant_id = $1
               AND cc.status IN ('active', 'pending')
           )
           ${searchCondition}
         ORDER BY u.full_name ASC NULLS LAST, u.email ASC
         LIMIT 50`,
        params
      );

      return {
        customers: result.rows.map((r: any) => ({
          id: r.id,
          email: r.email,
          name: r.name || null,
        })),
      };
    } catch (err) {
      fastify.log.error(`Consultant available customers error: ${err}`);
      reply.code(500).send({ error: 'Failed to load available customers' });
    }
  });

  // ── List Invitations ───────────────────────────────────────────────────
  fastify.get('/invitations', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);

      // Expire old pending invitations
      try {
        await db.query(
          `UPDATE customer_consultants
           SET status = 'expired', updated_at = NOW()
           WHERE consultant_id = $1 AND status = 'pending'
             AND created_at + INTERVAL '15 days' < NOW()`,
          [consultantId]
        );
      } catch { /* ignore */ }

      const result = await db.query(
        `SELECT
           cc.id,
           u.email,
           u.full_name AS name,
           cc.status,
           cc.created_at AS sent_at,
           cc.created_at + INTERVAL '15 days' AS expires_at
         FROM customer_consultants cc
         JOIN users u ON u.id = cc.customer_id
         WHERE cc.consultant_id = $1
         ORDER BY cc.created_at DESC`,
        [consultantId]
      );

      return {
        invitations: result.rows.map((r: any) => ({
          id: r.id,
          email: r.email,
          name: r.name || null,
          status: r.status,
          sentAt: new Date(r.sent_at).toISOString(),
          expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : null,
        })),
      };
    } catch (err) {
      fastify.log.error(`Consultant list invitations error: ${err}`);
      reply.code(500).send({ error: 'Failed to load invitations' });
    }
  });

  // ── Send Invitation ────────────────────────────────────────────────────
  fastify.post('/invitations', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const { email, name, message } = request.body as { email: string; name?: string; message?: string };

      if (!email?.trim()) {
        return reply.code(400).send({ error: 'Email is required' });
      }

      // Find the customer by email
      const userResult = await db.query(
        `SELECT id, email, full_name FROM users WHERE email = $1 AND role = 'customer'`,
        [email.trim().toLowerCase()]
      );

      if (userResult.rows.length === 0) {
        return reply.code(404).send({ error: 'No registered customer found with this email' });
      }

      const customer = userResult.rows[0];

      // Check if already linked
      const existingResult = await db.query(
        `SELECT id, status FROM customer_consultants
         WHERE consultant_id = $1 AND customer_id = $2`,
        [consultantId, customer.id]
      );

      if (existingResult.rows.length > 0) {
        const existing = existingResult.rows[0];
        if (existing.status === 'active') {
          return reply.code(409).send({ error: 'This customer is already linked to you' });
        }
        if (existing.status === 'pending') {
          return reply.code(409).send({ error: 'An invitation is already pending for this customer' });
        }
        // Re-invite if expired/revoked — update existing row
        await db.query(
          `UPDATE customer_consultants
           SET status = 'pending', updated_at = NOW(), created_at = NOW()
           WHERE id = $1`,
          [existing.id]
        );

        // Create notification for customer
        try {
          const consultantInfo = await db.query(
            `SELECT full_name FROM users WHERE id = $1`,
            [consultantId]
          );
          const consultantName = consultantInfo.rows[0]?.full_name || 'A consultant';
          await createAlert({
            userId: customer.id,
            severity: 'info',
            title: 'New Invitation',
            message: message || `${consultantName} invited you to connect.`,
            notificationType: 'consultant_invitation',
            linkUrl: '/app/invitations',
            metadata: { invitationId: existing.id, consultantId },
          });
          // Notify customer in real time
          const websocket = (fastify as any).websocket;
          if (websocket?.broadcastToUser) {
            websocket.broadcastToUser(customer.id, {
              type: 'consultant_invitation',
              consultantName,
              consultantId,
              invitationId: existing.id,
              message: message || `${consultantName} invited you to connect.`,
            });
          }
        } catch { /* notification not critical */ }

        return {
          invitation: {
            id: existing.id,
            email: customer.email,
            name: customer.full_name || name || null,
            status: 'pending',
            sentAt: new Date().toISOString(),
          },
        };
      }

      // Create new invitation
      const insertResult = await db.query(
        `INSERT INTO customer_consultants (consultant_id, customer_id, status)
         VALUES ($1, $2, 'pending')
         RETURNING id, created_at`,
        [consultantId, customer.id]
      );

      const row = insertResult.rows[0];

      // Create notification for customer
      try {
        const consultantInfo = await db.query(
          `SELECT full_name FROM users WHERE id = $1`,
          [consultantId]
        );
        const consultantName = consultantInfo.rows[0]?.full_name || 'A consultant';
        await createAlert({
          userId: customer.id,
          severity: 'info',
          title: 'New Invitation',
          message: message || `${consultantName} invited you to connect.`,
          notificationType: 'consultant_invitation',
          linkUrl: '/app/invitations',
          metadata: { invitationId: row.id, consultantId },
        });
        // Notify customer in real time
        const websocket = (fastify as any).websocket;
        if (websocket?.broadcastToUser) {
          websocket.broadcastToUser(customer.id, {
            type: 'consultant_invitation',
            consultantName,
            consultantId,
            invitationId: row.id,
            message: message || `${consultantName} invited you to connect.`,
          });
        }
      } catch { /* notification not critical */ }

      // Clear dashboard cache
      cache.delete(`consultant:${consultantId}:dashboard:metrics`);

      return {
        invitation: {
          id: row.id,
          email: customer.email,
          name: customer.full_name || name || null,
          status: 'pending',
          sentAt: new Date(row.created_at).toISOString(),
        },
      };
    } catch (err) {
      fastify.log.error(`Consultant send invitation error: ${err}`);
      reply.code(500).send({ error: 'Failed to send invitation' });
    }
  });

  // ── Delete Invitation ──────────────────────────────────────────────────
  fastify.delete('/invitations/:id', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const { id } = request.params as { id: string };

      const result = await db.query(
        `DELETE FROM customer_consultants
         WHERE id = $1 AND consultant_id = $2 AND status IN ('pending', 'expired')
         RETURNING id`,
        [id, consultantId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Invitation not found or cannot be deleted' });
      }

      cache.delete(`consultant:${consultantId}:dashboard:metrics`);

      return { message: 'Invitation deleted successfully' };
    } catch (err) {
      fastify.log.error(`Consultant delete invitation error: ${err}`);
      reply.code(500).send({ error: 'Failed to delete invitation' });
    }
  });

  // ── Messages: List Conversations ───────────────────────────────────────
  fastify.get('/messages/conversations', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);

      let hasMessages = false;
      try {
        await db.query('SELECT 1 FROM messages LIMIT 1');
        hasMessages = true;
      } catch {}

      let query = `
        SELECT
          c.id,
          c.customer_id,
          u.full_name AS client_name,
      `;
      if (hasMessages) {
        query += `
          (SELECT body FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
          (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message_time,
          (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != $1 AND is_read = FALSE) AS unread_count,
        `;
      } else {
        query += `
          NULL AS last_message,
          NULL AS last_message_time,
          0 AS unread_count,
        `;
      }
      query += `
          c.updated_at
        FROM conversations c
        JOIN users u ON c.customer_id = u.id
        WHERE c.consultant_id = $1
        ORDER BY c.updated_at DESC
      `;

      const result = await db.query(query, [consultantId]);

      return {
        conversations: result.rows.map((r: any) => ({
          id: r.id,
          clientId: r.customer_id,
          clientName: r.client_name || 'Client',
          lastMessage: r.last_message || '',
          timestamp: r.last_message_time
            ? new Date(r.last_message_time).toISOString()
            : new Date(r.updated_at).toISOString(),
          unread: parseInt(r.unread_count) || 0,
        })),
      };
    } catch (err) {
      fastify.log.error(`Consultant list conversations error: ${err}`);
      reply.code(500).send({ error: 'Failed to load conversations' });
    }
  });

  // ── Messages: Create Conversation ──────────────────────────────────────
  fastify.post('/messages/conversations', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const { customerId } = request.body as { customerId: string };

      if (!customerId) {
        return reply.code(400).send({ error: 'customerId is required' });
      }

      // Verify relationship
      const linkCheck = await db.query(
        `SELECT id FROM customer_consultants
         WHERE consultant_id = $1 AND customer_id = $2 AND status = 'active'`,
        [consultantId, customerId]
      );
      if (linkCheck.rows.length === 0) {
        return reply.code(403).send({ error: 'No active relationship with this client' });
      }

      // Check if conversation already exists
      const existing = await db.query(
        `SELECT id FROM conversations
         WHERE consultant_id = $1 AND customer_id = $2`,
        [consultantId, customerId]
      );

      if (existing.rows.length > 0) {
        const convId = existing.rows[0].id;
        const nameResult = await db.query(
          `SELECT full_name FROM users WHERE id = $1`,
          [customerId]
        );
        return {
          conversation: {
            id: convId,
            clientId: customerId,
            clientName: nameResult.rows[0]?.full_name || 'Client',
          },
        };
      }

      // Create new conversation
      const result = await db.query(
        `INSERT INTO conversations (consultant_id, customer_id)
         VALUES ($1, $2)
         RETURNING id`,
        [consultantId, customerId]
      );

      const nameResult = await db.query(
        `SELECT full_name FROM users WHERE id = $1`,
        [customerId]
      );

      return {
        conversation: {
          id: result.rows[0].id,
          clientId: customerId,
          clientName: nameResult.rows[0]?.full_name || 'Client',
        },
      };
    } catch (err) {
      fastify.log.error(`Consultant create conversation error: ${err}`);
      reply.code(500).send({ error: 'Failed to create conversation' });
    }
  });

  // ── Messages: Get Conversation with Messages ──────────────────────────
  fastify.get('/messages/conversations/:id', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const { id } = request.params as { id: string };

      const convResult = await db.query(
        `SELECT c.id, c.customer_id, u.full_name AS client_name
         FROM conversations c
         JOIN users u ON c.customer_id = u.id
         WHERE c.id = $1 AND c.consultant_id = $2`,
        [id, consultantId]
      );

      if (convResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Conversation not found' });
      }

      const conv = convResult.rows[0];

      // Fetch messages
      let messagesResult: { rows: any[] };
      const queryWithAttachments = `
        SELECT m.id, m.sender_id, m.body, m.created_at AS timestamp,
               m.attachment_url, m.attachment_name, u.role
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = $1
        ORDER BY m.created_at ASC`;
      const queryWithout = `
        SELECT m.id, m.sender_id, m.body, m.created_at AS timestamp, u.role
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = $1
        ORDER BY m.created_at ASC`;

      try {
        messagesResult = await db.query(queryWithAttachments, [id]);
      } catch (colErr: any) {
        if (colErr.code === '42703' || colErr.message?.includes('attachment_url')) {
          messagesResult = await db.query(queryWithout, [id]);
        } else {
          throw colErr;
        }
      }

      // Mark messages as read (messages not sent by consultant)
      await db.query(
        `UPDATE messages SET is_read = TRUE
         WHERE conversation_id = $1 AND sender_id != $2 AND is_read = FALSE`,
        [id, consultantId]
      );

      return {
        conversation: {
          id: conv.id,
          clientId: conv.customer_id,
          clientName: conv.client_name || 'Client',
        },
        messages: messagesResult.rows.map((r: any) => ({
          id: r.id,
          sender: r.role === 'consultant' ? 'consultant' : 'client',
          content: r.body,
          timestamp: new Date(r.timestamp).toISOString(),
          attachmentUrl: r.attachment_url ?? undefined,
          attachmentName: r.attachment_name ?? undefined,
        })),
      };
    } catch (err) {
      fastify.log.error(`Consultant get conversation error: ${err}`);
      reply.code(500).send({ error: 'Failed to load conversation' });
    }
  });

  // ── Messages: Upload File ──────────────────────────────────────────────
  fastify.post('/messages/upload', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { file, filename } = request.body as { file?: string; filename?: string };
      if (!file || !filename || typeof file !== 'string' || typeof filename !== 'string') {
        return reply.code(400).send({ error: 'file (base64) and filename are required' });
      }
      const ext = path.extname(filename).toLowerCase().slice(1) || 'bin';
      if (!ALLOWED_EXT.has(ext)) {
        return reply.code(400).send({ error: 'File type not allowed. Allowed: ' + [...ALLOWED_EXT].join(', ') });
      }
      const buf = Buffer.from(file, 'base64');
      if (buf.length > MAX_FILE_SIZE) {
        return reply.code(400).send({ error: 'File too large (max 10MB)' });
      }
      if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      }
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const filePath = path.join(UPLOAD_DIR, safeName);
      fs.writeFileSync(filePath, buf);
      const url = `/api/messages/files/${encodeURIComponent(safeName)}`;
      return { url, filename: path.basename(filename) };
    } catch (err) {
      fastify.log.error(`Consultant upload file error: ${err}`);
      reply.code(500).send({ error: 'Upload failed' });
    }
  });

  // ── Messages: Send Message ─────────────────────────────────────────────
  fastify.post('/messages/conversations/:id/messages', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const { id } = request.params as { id: string };
      const { body, attachmentUrl, attachmentName } = request.body as {
        body?: string; attachmentUrl?: string; attachmentName?: string;
      };
      const hasBody = body != null && String(body).trim().length > 0;
      const hasAttachment = attachmentUrl && attachmentName;

      if (!hasBody && !hasAttachment) {
        return reply.code(400).send({ error: 'Message body or attachment is required' });
      }

      const accessCheck = await db.query(
        `SELECT customer_id FROM conversations WHERE id = $1 AND consultant_id = $2`,
        [id, consultantId]
      );
      if (accessCheck.rows.length === 0) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      const customerId = accessCheck.rows[0].customer_id;
      const msgBody = hasBody ? body!.trim() : (hasAttachment ? '(arquivo)' : '');

      let result: { rows: any[] };
      try {
        result = await db.query(
          `INSERT INTO messages (conversation_id, sender_id, body, attachment_url, attachment_name)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, body, created_at, attachment_url, attachment_name`,
          [id, consultantId, msgBody, hasAttachment ? attachmentUrl : null, hasAttachment ? attachmentName : null]
        );
      } catch (colErr: any) {
        if (colErr.code === '42703' || colErr.message?.includes('attachment_url') || colErr.message?.includes('attachment_name')) {
          result = await db.query(
            `INSERT INTO messages (conversation_id, sender_id, body)
             VALUES ($1, $2, $3)
             RETURNING id, body, created_at`,
            [id, consultantId, msgBody]
          );
        } else {
          throw colErr;
        }
      }

      const row = result.rows[0];
      await db.query(`UPDATE conversations SET updated_at = NOW() WHERE id = $1`, [id]);

      const messagePayload = {
        id: row.id,
        sender: 'consultant' as const,
        content: row.body,
        timestamp: new Date(row.created_at).toISOString(),
        attachmentUrl: row.attachment_url ?? undefined,
        attachmentName: row.attachment_name ?? undefined,
      };

      // Broadcast to customer
      const websocket = (fastify as any).websocket;
      if (websocket?.broadcastToUser) {
        websocket.broadcastToUser(customerId, {
          type: 'new_message',
          conversationId: id,
          message: messagePayload,
        });
      }

      return { message: messagePayload };
    } catch (err) {
      fastify.log.error(`Consultant send message error: ${err}`);
      reply.code(500).send({ error: 'Failed to send message' });
    }
  });

  // ── Messages: Clear History ────────────────────────────────────────────
  fastify.delete('/messages/conversations/:id/messages', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const { id } = request.params as { id: string };

      const accessCheck = await db.query(
        `SELECT customer_id FROM conversations WHERE id = $1 AND consultant_id = $2`,
        [id, consultantId]
      );
      if (accessCheck.rows.length === 0) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      const customerId = accessCheck.rows[0].customer_id;
      await db.query(`DELETE FROM messages WHERE conversation_id = $1`, [id]);
      await db.query(`UPDATE conversations SET updated_at = NOW() WHERE id = $1`, [id]);

      const websocket = (fastify as any).websocket;
      if (websocket?.broadcastToUser) {
        websocket.broadcastToUser(customerId, { type: 'conversation_cleared', conversationId: id });
      }

      return { message: 'History cleared successfully' };
    } catch (err) {
      fastify.log.error(`Consultant clear history error: ${err}`);
      reply.code(500).send({ error: 'Failed to clear history' });
    }
  });

  // ── Messages: Delete Conversation ──────────────────────────────────────
  fastify.delete('/messages/conversations/:id', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const { id } = request.params as { id: string };

      const accessCheck = await db.query(
        `SELECT customer_id FROM conversations WHERE id = $1 AND consultant_id = $2`,
        [id, consultantId]
      );
      if (accessCheck.rows.length === 0) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      const customerId = accessCheck.rows[0].customer_id;
      await db.query(`DELETE FROM conversations WHERE id = $1`, [id]);

      const websocket = (fastify as any).websocket;
      if (websocket?.broadcastToUser) {
        websocket.broadcastToUser(customerId, { type: 'conversation_deleted', conversationId: id });
      }

      return { message: 'Conversation deleted successfully' };
    } catch (err) {
      fastify.log.error(`Consultant delete conversation error: ${err}`);
      reply.code(500).send({ error: 'Failed to delete conversation' });
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  PIPELINE / CRM PROSPECTS
  // ══════════════════════════════════════════════════════════════════════════

  // ── Get Pipeline (list prospects) ─────────────────────────────────────
  fastify.get('/pipeline', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);

      // Check if crm_leads table exists
      try {
        await db.query('SELECT 1 FROM crm_leads LIMIT 1');
      } catch {
        return { prospects: [] };
      }

      const result = await db.query(
        `SELECT id, full_name, email, phone, stage, notes, created_at, updated_at
         FROM crm_leads
         WHERE consultant_id = $1
         ORDER BY
           CASE stage
             WHEN 'lead' THEN 1
             WHEN 'contacted' THEN 2
             WHEN 'meeting' THEN 3
             WHEN 'proposal' THEN 4
             WHEN 'won' THEN 5
             WHEN 'lost' THEN 6
             ELSE 7
           END,
           created_at DESC`,
        [consultantId]
      );

      const prospects = result.rows.map((r: any) => ({
        id: r.id,
        name: r.full_name || '',
        email: r.email || '',
        phone: r.phone || '',
        stage: r.stage,
        notes: r.notes || '',
        createdAt: r.created_at,
      }));

      return { prospects };
    } catch (err) {
      fastify.log.error(`Consultant get pipeline error: ${err}`);
      reply.code(500).send({ error: 'Failed to fetch pipeline' });
    }
  });

  // ── Create / Update Prospect ──────────────────────────────────────────
  fastify.post('/pipeline/prospects', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const { id, name, email, phone, stage, notes } = request.body as {
        id?: string;
        name?: string;
        email?: string;
        phone?: string;
        stage?: string;
        notes?: string;
      };

      // Check if crm_leads table exists
      try {
        await db.query('SELECT 1 FROM crm_leads LIMIT 1');
      } catch {
        return reply.code(500).send({ error: 'Pipeline table not available' });
      }

      const validStages = ['lead', 'contacted', 'meeting', 'proposal', 'won', 'lost'];
      const safeStage = validStages.includes(stage || '') ? stage : 'lead';

      if (id) {
        // Update existing prospect
        const result = await db.query(
          `UPDATE crm_leads
           SET full_name = COALESCE($1, full_name),
               email = COALESCE($2, email),
               phone = COALESCE($3, phone),
               stage = COALESCE($4, stage),
               notes = COALESCE($5, notes),
               updated_at = NOW()
           WHERE id = $6 AND consultant_id = $7
           RETURNING id, full_name, email, phone, stage, notes, created_at`,
          [name || null, email || null, phone || null, safeStage, notes || null, id, consultantId]
        );

        if (result.rows.length === 0) {
          return reply.code(404).send({ error: 'Prospect not found' });
        }

        const r = result.rows[0];
        return {
          prospect: {
            id: r.id,
            name: r.full_name || '',
            email: r.email || '',
            phone: r.phone || '',
            stage: r.stage,
            notes: r.notes || '',
            createdAt: r.created_at,
          },
        };
      }

      // Create new prospect
      if (!email?.trim() && !name?.trim()) {
        return reply.code(400).send({ error: 'Name or email is required' });
      }

      const result = await db.query(
        `INSERT INTO crm_leads (consultant_id, full_name, email, phone, stage, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, full_name, email, phone, stage, notes, created_at`,
        [consultantId, name || null, email?.trim().toLowerCase() || null, phone || null, safeStage, notes || null]
      );

      const r = result.rows[0];
      return {
        prospect: {
          id: r.id,
          name: r.full_name || '',
          email: r.email || '',
          phone: r.phone || '',
          stage: r.stage,
          notes: r.notes || '',
          createdAt: r.created_at,
        },
      };
    } catch (err) {
      fastify.log.error(`Consultant create/update prospect error: ${err}`);
      reply.code(500).send({ error: 'Failed to save prospect' });
    }
  });

  // ── Update Prospect Stage ─────────────────────────────────────────────
  fastify.patch('/pipeline/prospects/:id/stage', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const { id } = request.params as { id: string };
      const { stage } = request.body as { stage: string };

      const validStages = ['lead', 'contacted', 'meeting', 'proposal', 'won', 'lost'];
      if (!validStages.includes(stage)) {
        return reply.code(400).send({ error: 'Invalid stage' });
      }

      const result = await db.query(
        `UPDATE crm_leads SET stage = $1, updated_at = NOW()
         WHERE id = $2 AND consultant_id = $3
         RETURNING id, full_name, email, phone, stage, notes, created_at`,
        [stage, id, consultantId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Prospect not found' });
      }

      const r = result.rows[0];
      return {
        prospect: {
          id: r.id,
          name: r.full_name || '',
          email: r.email || '',
          phone: r.phone || '',
          stage: r.stage,
          notes: r.notes || '',
          createdAt: r.created_at,
        },
      };
    } catch (err) {
      fastify.log.error(`Consultant update prospect stage error: ${err}`);
      reply.code(500).send({ error: 'Failed to update prospect stage' });
    }
  });

  // ── Delete Prospect ───────────────────────────────────────────────────
  fastify.delete('/pipeline/prospects/:id', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const { id } = request.params as { id: string };

      const result = await db.query(
        `DELETE FROM crm_leads WHERE id = $1 AND consultant_id = $2 RETURNING id`,
        [id, consultantId]
      );

      if (result.rowCount === 0) {
        return reply.code(404).send({ error: 'Prospect not found' });
      }

      return { message: 'Prospect deleted successfully' };
    } catch (err) {
      fastify.log.error(`Consultant delete prospect error: ${err}`);
      reply.code(500).send({ error: 'Failed to delete prospect' });
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  CONSULTANT REPORTS
  // ══════════════════════════════════════════════════════════════════════════

  // ── List Reports ──────────────────────────────────────────────────────
  fastify.get('/reports', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const { clientId } = request.query as { clientId?: string };

      // Check if reports table exists
      try {
        await db.query('SELECT 1 FROM reports LIMIT 1');
      } catch {
        return { reports: [] };
      }

      let query: string;
      let params: any[];

      if (clientId) {
        query = `SELECT r.id, r.type, r.params_json, r.file_url, r.created_at, r.target_user_id,
                        u.full_name as client_name
                 FROM reports r
                 LEFT JOIN users u ON u.id = r.target_user_id
                 WHERE r.owner_user_id = $1 AND r.target_user_id = $2
                 ORDER BY r.created_at DESC
                 LIMIT 100`;
        params = [consultantId, clientId];
      } else {
        query = `SELECT r.id, r.type, r.params_json, r.file_url, r.created_at, r.target_user_id,
                        u.full_name as client_name
                 FROM reports r
                 LEFT JOIN users u ON u.id = r.target_user_id
                 WHERE r.owner_user_id = $1
                 ORDER BY r.created_at DESC
                 LIMIT 100`;
        params = [consultantId];
      }

      const result = await db.query(query, params);

      const reports = result.rows.map((row: any) => ({
        id: row.id,
        clientName: row.client_name || 'N/A',
        type: row.type,
        generatedAt: row.created_at,
        status: row.file_url ? 'completed' : 'processing',
        hasWatermark: row.params_json?.includeWatermark ?? false,
        downloadUrl: row.file_url || null,
      }));

      return { reports };
    } catch (err) {
      fastify.log.error(`Consultant list reports error: ${err}`);
      reply.code(500).send({ error: 'Failed to list reports' });
    }
  });

  // ── Generate Report ───────────────────────────────────────────────────
  fastify.post('/reports/generate', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const { clientId, type, includeWatermark, customBranding } = request.body as {
        clientId?: string;
        type: string;
        includeWatermark?: boolean;
        customBranding?: boolean;
      };

      if (!type) {
        return reply.code(400).send({ error: 'Report type is required' });
      }

      // Check if reports table exists
      try {
        await db.query('SELECT 1 FROM reports LIMIT 1');
      } catch {
        return reply.code(500).send({ error: 'Reports table not available' });
      }

      const paramsJson = { includeWatermark: includeWatermark ?? false, customBranding: customBranding ?? false };

      // Try with exact type, fallback to 'advisor_custom' if enum rejects
      let result;
      try {
        result = await db.query(
          `INSERT INTO reports (owner_user_id, target_user_id, type, params_json)
           VALUES ($1, $2, $3, $4)
           RETURNING id, type, created_at`,
          [consultantId, clientId || null, type, JSON.stringify(paramsJson)]
        );
      } catch (enumErr: any) {
        if (enumErr.code === '22P02') {
          result = await db.query(
            `INSERT INTO reports (owner_user_id, target_user_id, type, params_json)
             VALUES ($1, $2, 'advisor_custom', $3)
             RETURNING id, type, created_at`,
            [consultantId, clientId || null, JSON.stringify({ ...paramsJson, originalType: type })]
          );
        } else {
          throw enumErr;
        }
      }

      const row = result.rows[0];
      return {
        report: {
          id: row.id,
          type: row.type,
          generatedAt: row.created_at,
          status: 'processing',
        },
        message: 'Report generation started successfully',
      };
    } catch (err) {
      fastify.log.error(`Consultant generate report error: ${err}`);
      reply.code(500).send({ error: 'Failed to generate report' });
    }
  });

  // ── Download Report File ──────────────────────────────────────────────
  fastify.get('/reports/:id/file', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const { id } = request.params as { id: string };

      const result = await db.query(
        `SELECT id, type, file_url, params_json, created_at
         FROM reports
         WHERE id = $1 AND owner_user_id = $2`,
        [id, consultantId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Report not found' });
      }

      const report = result.rows[0];

      if (!report.file_url) {
        // Report is still processing or has no file yet – return a simple placeholder PDF
        const reportType = report.type || 'consolidated';
        const createdAt = new Date(report.created_at).toLocaleDateString('en-US');
        const params = report.params_json || {};

        // Generate a minimal text-based report as a placeholder
        const content = [
          `Report: ${reportType.replace(/_/g, ' ').toUpperCase()}`,
          `Generated: ${createdAt}`,
          `Report ID: ${report.id}`,
          params.dateRange ? `Date Range: ${params.dateRange}` : '',
          '',
          'This report is being generated. Full content will be available shortly.',
        ].filter(Boolean).join('\n');

        const filename = `report-${reportType}-${report.id.slice(0, 8)}.txt`;

        reply.header('Content-Type', 'text/plain; charset=utf-8');
        reply.header('Content-Disposition', `attachment; filename="${filename}"`);
        return reply.send(content);
      }

      // If file_url is an external URL, redirect to it
      if (report.file_url.startsWith('http')) {
        return reply.redirect(report.file_url);
      }

      // If file_url is a local path, send the file
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.resolve(report.file_url);

      if (!fs.existsSync(filePath)) {
        return reply.code(404).send({ error: 'Report file not found on disk' });
      }

      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.pdf': 'application/pdf',
        '.csv': 'text/csv',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.txt': 'text/plain',
      };

      reply.header('Content-Type', mimeTypes[ext] || 'application/octet-stream');
      reply.header('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
      const stream = fs.createReadStream(filePath);
      return reply.send(stream);
    } catch (err) {
      fastify.log.error(`Consultant download report file error: ${err}`);
      reply.code(500).send({ error: 'Failed to download report file' });
    }
  });

  // ── Delete Report ─────────────────────────────────────────────────────
  fastify.delete('/reports/:id', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const { id } = request.params as { id: string };

      const result = await db.query(
        `DELETE FROM reports WHERE id = $1 AND owner_user_id = $2 RETURNING id`,
        [id, consultantId]
      );

      if (result.rowCount === 0) {
        return reply.code(404).send({ error: 'Report not found' });
      }

      return { message: 'Report deleted successfully' };
    } catch (err) {
      fastify.log.error(`Consultant delete report error: ${err}`);
      reply.code(500).send({ error: 'Failed to delete report' });
    }
  });
}
