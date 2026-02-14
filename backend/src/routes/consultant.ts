import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';
import { cache } from '../utils/cache.js';

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
}
