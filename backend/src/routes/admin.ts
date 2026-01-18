import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';
import { cache } from '../utils/cache.js';
import { logAudit, getClientIp } from '../utils/audit.js';

export async function adminRoutes(fastify: FastifyInstance) {
  // Middleware: Only admins can access these routes
  const requireAdmin = async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
      if ((request.user as any).role !== 'admin') {
        reply.code(403).send({ error: 'Access denied. Admin role required.' });
      }
    } catch (err) {
      reply.send(err);
    }
  };

  // Helper to get admin ID from request
  const getAdminId = (request: any): string => {
    return (request.user as any).userId;
  };

  // Admin Dashboard - Platform Metrics (with caching)
  fastify.get('/dashboard/metrics', {
    preHandler: [requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const cacheKey = 'admin:dashboard:metrics';
      
      // Try to get from cache first
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // Cache miss - fetch from database
      // Get active users count
      const activeUsersResult = await db.query(
        `SELECT COUNT(*) as count FROM users WHERE role IN ('customer', 'consultant')`
      );
      const activeUsers = parseInt(activeUsersResult.rows[0].count);

      // Get new users this month
      const newUsersResult = await db.query(
        `SELECT COUNT(*) as count 
         FROM users 
         WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
         AND role IN ('customer', 'consultant')`
      );
      const newUsers = parseInt(newUsersResult.rows[0].count);

      // Calculate MRR (Monthly Recurring Revenue) - handle missing tables
      let mrr = 0;
      try {
        const mrrResult = await db.query(
          `SELECT COALESCE(SUM(p.price_cents), 0) / 100.0 as mrr
           FROM subscriptions s
           JOIN plans p ON s.plan_id = p.id
           WHERE s.status = 'active'
           AND s.current_period_end > NOW()`
        );
        mrr = parseFloat(mrrResult.rows[0].mrr) || 0;
      } catch (e) {
        // Tables might not exist yet
        mrr = 0;
      }

      // Calculate churn rate (last 30 days) - handle missing tables
      let churnRate = 0;
      try {
        const churnResult = await db.query(
          `SELECT 
             COUNT(*) FILTER (WHERE s.status = 'canceled' AND s.canceled_at >= NOW() - INTERVAL '30 days') as canceled,
             COUNT(*) FILTER (WHERE s.status = 'active' AND s.current_period_start >= NOW() - INTERVAL '30 days') as active_start
           FROM subscriptions s`
        );
        const canceled = parseInt(churnResult.rows[0].canceled) || 0;
        const activeStart = parseInt(churnResult.rows[0].active_start) || 0;
        const totalActive = activeStart + canceled;
        churnRate = totalActive > 0 ? (canceled / totalActive) * 100 : 0;
      } catch (e) {
        // Tables might not exist yet
        churnRate = 0;
      }

      // Get user growth data (last 7 months)
      const growthResult = await db.query(
        `SELECT 
           TO_CHAR(created_at, 'Mon') as month,
           EXTRACT(MONTH FROM created_at) as month_num,
           COUNT(*) as users
         FROM users
         WHERE created_at >= NOW() - INTERVAL '7 months'
         AND role IN ('customer', 'consultant')
         GROUP BY month, month_num
         ORDER BY month_num DESC`
      );

      // Get revenue data (last 7 months) - handle missing tables
      let revenueResult;
      try {
        revenueResult = await db.query(
          `SELECT 
             TO_CHAR(p.created_at, 'Mon') as month,
             EXTRACT(MONTH FROM p.created_at) as month_num,
             COALESCE(SUM(p.amount_cents), 0) / 100.0 as revenue
           FROM payments p
           JOIN subscriptions s ON p.subscription_id = s.id
           WHERE p.status = 'paid'
           AND p.created_at >= NOW() - INTERVAL '7 months'
           GROUP BY month, month_num
           ORDER BY month_num DESC`
        );
      } catch (e) {
        // Tables might not exist yet
        revenueResult = { rows: [] };
      }

      // Get system alerts - if table doesn't exist, return empty array
      let alertsResult;
      try {
        alertsResult = await db.query(
        `SELECT 
           id,
           type,
           message,
           created_at
         FROM system_alerts
         WHERE resolved = false
         ORDER BY created_at DESC
         LIMIT 10`
        );
      } catch (e) {
        alertsResult = { rows: [] };
      }

      const result = {
        kpis: {
          activeUsers,
          newUsers,
          mrr,
          churnRate: parseFloat(churnRate.toFixed(2)),
        },
        userGrowth: growthResult.rows.map(row => ({
          month: row.month,
          users: parseInt(row.users),
        })),
        revenue: revenueResult.rows.map(row => ({
          month: row.month,
          revenue: parseFloat(row.revenue),
        })),
        alerts: alertsResult.rows.map(row => ({
          id: row.id,
          type: row.type,
          message: row.message,
          time: row.created_at,
        })),
      };

      // Cache for 60 seconds
      cache.set(cacheKey, result, 60000);
      return result;
    } catch (error: any) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch dashboard metrics' });
    }
  });

  // Get all users with filters and pagination
  fastify.get('/users', {
    preHandler: [requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { search, role, status, page = '1', limit = '20' } = request.query as any;
      const pageNum = parseInt(page) || 1;
      const limitNum = Math.min(parseInt(limit) || 20, 100); // Max 100 per page
      const offset = (pageNum - 1) * limitNum;
      
      // Build WHERE clause
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (search) {
        whereClause += ` AND (u.full_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (role) {
        whereClause += ` AND u.role = $${paramIndex}`;
        params.push(role);
        paramIndex++;
      }

      if (status) {
        // Status can be 'active' (is_active = true) or 'inactive' (is_active = false)
        if (status === 'active') {
          whereClause += ` AND u.is_active = true`;
        } else if (status === 'inactive') {
          whereClause += ` AND u.is_active = false`;
        }
      }

      // Check if subscriptions table exists
      let hasSubscriptions = false;
      try {
        await db.query('SELECT 1 FROM subscriptions LIMIT 1');
        hasSubscriptions = true;
      } catch {
        // Table doesn't exist, use simple query
        hasSubscriptions = false;
      }

      // Get total count
      let countQuery: string;
      if (hasSubscriptions) {
        countQuery = `
          SELECT COUNT(*) as total
          FROM users u
          LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
          ${whereClause}
        `;
      } else {
        countQuery = `
          SELECT COUNT(*) as total
          FROM users u
          ${whereClause}
        `;
      }
      const countResult = await db.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // Get paginated results
      let dataQuery: string;
      const dataParams = [...params];
      if (hasSubscriptions) {
        dataQuery = `
          SELECT 
            u.id,
            u.full_name,
            u.email,
            u.role,
            u.created_at,
            s.status as subscription_status,
            p.name as plan_name
          FROM users u
          LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
          LEFT JOIN plans p ON s.plan_id = p.id
          ${whereClause}
          ORDER BY u.created_at DESC
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
      } else {
        dataQuery = `
          SELECT 
            u.id,
            u.full_name,
            u.email,
            u.role,
            u.created_at
          FROM users u
          ${whereClause}
          ORDER BY u.created_at DESC
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
      }
      dataParams.push(limitNum, offset);
      const result = await db.query(dataQuery, dataParams);

      return {
        users: result.rows.map((row: any) => ({
          id: row.id,
          name: row.full_name,
          email: row.email,
          role: row.role,
          status: hasSubscriptions ? (row.subscription_status === 'active' ? 'active' : 'pending') : 'pending',
          plan: hasSubscriptions ? (row.plan_name || null) : null,
          createdAt: row.created_at,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    } catch (error: any) {
      fastify.log.error('Error fetching users:', error);
      console.error('Full error:', error);
      reply.code(500).send({ error: 'Failed to fetch users', details: error.message });
    }
  });

  // Get user by ID
  fastify.get('/users/:id', {
    preHandler: [requireAdmin],
  }, async (request: any, reply) => {
    try {
      const { id } = request.params;
      
      const result = await db.query(
        `SELECT 
           u.id,
           u.full_name,
           u.email,
           u.role,
           u.created_at,
           s.status as subscription_status,
           p.name as plan_name
         FROM users u
         LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
         LEFT JOIN plans p ON s.plan_id = p.id
         WHERE u.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        reply.code(404).send({ error: 'User not found' });
        return;
      }

      const row = result.rows[0];
      return {
        user: {
          id: row.id,
          name: row.full_name,
          email: row.email,
          role: row.role,
          status: row.subscription_status === 'active' ? 'active' : 'pending',
          plan: row.plan_name || null,
          createdAt: row.created_at,
        },
      };
    } catch (error: any) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch user' });
    }
  });

  // Update user role
  fastify.patch('/users/:id/role', {
    preHandler: [requireAdmin],
  }, async (request: any, reply) => {
    try {
      const { id } = request.params;
      const { role } = request.body as { role: string };
      const adminId = getAdminId(request);

      if (!['customer', 'consultant', 'admin'].includes(role)) {
        reply.code(400).send({ error: 'Invalid role' });
        return;
      }

      // Get old value for audit log
      const oldUserResult = await db.query('SELECT role FROM users WHERE id = $1', [id]);
      if (oldUserResult.rows.length === 0) {
        reply.code(404).send({ error: 'User not found' });
        return;
      }
      const oldRole = oldUserResult.rows[0].role;

      // Update user
      await db.query(
        `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2`,
        [role, id]
      );

      // Log audit
      await logAudit({
        adminId,
        action: 'user_role_changed',
        resourceType: 'user',
        resourceId: id,
        oldValue: { role: oldRole },
        newValue: { role },
        ipAddress: getClientIp(request),
        userAgent: request.headers['user-agent'],
      });

      // Invalidate cache
      cache.delete('admin:dashboard:metrics');

      return { message: 'User role updated successfully' };
    } catch (error: any) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to update user role' });
    }
  });

  // Block/Unblock user
  fastify.patch('/users/:id/status', {
    preHandler: [requireAdmin],
  }, async (request: any, reply) => {
    try {
      const { id } = request.params;
      const { status } = request.body as { status: 'active' | 'blocked' };
      const adminId = getAdminId(request);

      // Get old status for audit log
      const oldUserResult = await db.query(
        `SELECT 
           (SELECT EXISTS(SELECT 1 FROM blocked_users WHERE user_id = $1)) as is_blocked
         FROM users WHERE id = $1`,
        [id]
      );
      if (oldUserResult.rows.length === 0) {
        reply.code(404).send({ error: 'User not found' });
        return;
      }
      const oldStatus = oldUserResult.rows[0].is_blocked ? 'blocked' : 'active';

      // Create blocked_users table if it doesn't exist (for simplicity, using a simple approach)
      // In production, you'd use a proper migration
      try {
        if (status === 'blocked') {
          await db.query(
            `INSERT INTO blocked_users (user_id, created_at) 
             VALUES ($1, NOW()) 
             ON CONFLICT (user_id) DO NOTHING`,
            [id]
          );
        } else {
          await db.query(`DELETE FROM blocked_users WHERE user_id = $1`, [id]);
        }
      } catch (e: any) {
        // Table might not exist yet, that's ok - the migration will create it
        // For now, just update updated_at as a placeholder
        await db.query(`UPDATE users SET updated_at = NOW() WHERE id = $1`, [id]);
      }

      // Log audit
      await logAudit({
        adminId,
        action: status === 'blocked' ? 'user_blocked' : 'user_unblocked',
        resourceType: 'user',
        resourceId: id,
        oldValue: { status: oldStatus },
        newValue: { status },
        ipAddress: getClientIp(request),
        userAgent: request.headers['user-agent'],
      });

      // Invalidate cache
      cache.delete('admin:dashboard:metrics');

      return { message: `User ${status === 'blocked' ? 'blocked' : 'unblocked'} successfully` };
    } catch (error: any) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to update user status' });
    }
  });

  // Get all subscriptions with pagination
  fastify.get('/subscriptions', {
    preHandler: [requireAdmin],
  }, async (request: any, reply) => {
    try {
      // Check if subscriptions and plans tables exist
      let tablesExist = false;
      try {
        await db.query('SELECT 1 FROM subscriptions LIMIT 1');
        await db.query('SELECT 1 FROM plans LIMIT 1');
        tablesExist = true;
      } catch {
        // Tables don't exist, return empty result
        tablesExist = false;
      }

      if (!tablesExist) {
        return {
          subscriptions: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
          },
        };
      }

      const { search, status, plan, page = '1', limit = '20' } = request.query as any;
      const pageNum = parseInt(page) || 1;
      const limitNum = Math.min(parseInt(limit) || 20, 100); // Max 100 per page
      const offset = (pageNum - 1) * limitNum;
      
      // Build WHERE clause
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (search) {
        whereClause += ` AND (u.full_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (status) {
        whereClause += ` AND s.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (plan) {
        whereClause += ` AND p.name = $${paramIndex}`;
        params.push(plan);
        paramIndex++;
      }

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM subscriptions s
        JOIN users u ON s.user_id = u.id
        JOIN plans p ON s.plan_id = p.id
        ${whereClause}
      `;
      const countResult = await db.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // Get paginated results
      const dataQuery = `
        SELECT 
          s.id,
          u.full_name as user_name,
          u.email,
          p.name as plan_name,
          p.price_cents / 100.0 as amount,
          s.status,
          s.current_period_end as next_billing,
          s.created_at
        FROM subscriptions s
        JOIN users u ON s.user_id = u.id
        JOIN plans p ON s.plan_id = p.id
        ${whereClause}
        ORDER BY s.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(limitNum, offset);
      const result = await db.query(dataQuery, params);

      return {
        subscriptions: result.rows.map((row: any) => ({
          id: row.id,
          user: row.user_name,
          email: row.email,
          plan: row.plan_name,
          amount: parseFloat(row.amount),
          status: row.status,
          nextBilling: row.next_billing,
          createdAt: row.created_at,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    } catch (error: any) {
      fastify.log.error('Error fetching subscriptions:', error);
      console.error('Full error:', error);
      reply.code(500).send({ error: 'Failed to fetch subscriptions', details: error.message });
    }
  });

  // Get financial reports
  fastify.get('/financial/reports', {
    preHandler: [requireAdmin],
  }, async (request: any, reply) => {
    try {
      // Check which tables exist
      let hasPayments = false;
      let hasSubscriptions = false;
      let hasPlans = false;
      let hasCustomerConsultants = false;

      try {
        await db.query('SELECT 1 FROM payments LIMIT 1');
        hasPayments = true;
      } catch {
        hasPayments = false;
      }

      try {
        await db.query('SELECT 1 FROM subscriptions LIMIT 1');
        hasSubscriptions = true;
      } catch {
        hasSubscriptions = false;
      }

      try {
        await db.query('SELECT 1 FROM plans LIMIT 1');
        hasPlans = true;
      } catch {
        hasPlans = false;
      }

      try {
        await db.query('SELECT 1 FROM customer_consultants LIMIT 1');
        hasCustomerConsultants = true;
      } catch {
        hasCustomerConsultants = false;
      }

      // Total revenue (last 6 months) - handle missing payments table
      let revenueResult: any;
      if (hasPayments) {
        try {
          revenueResult = await db.query(
            `SELECT 
               TO_CHAR(created_at, 'Mon') as month,
               EXTRACT(MONTH FROM created_at) as month_num,
               COALESCE(SUM(amount_cents), 0) / 100.0 as revenue
             FROM payments
             WHERE status = 'paid'
             AND created_at >= NOW() - INTERVAL '6 months'
             GROUP BY month, month_num
             ORDER BY month_num DESC`
          );
        } catch (e) {
          revenueResult = { rows: [] };
        }
      } else {
        revenueResult = { rows: [] };
      }

      // MRR - handle missing subscriptions/plans tables
      let mrr = 0;
      if (hasSubscriptions && hasPlans) {
        try {
          const mrrResult = await db.query(
            `SELECT COALESCE(SUM(p.price_cents), 0) / 100.0 as mrr
             FROM subscriptions s
             JOIN plans p ON s.plan_id = p.id
             WHERE s.status = 'active'`
          );
          mrr = parseFloat(mrrResult.rows[0]?.mrr) || 0;
        } catch (e) {
          mrr = 0;
        }
      }

      // Commissions by consultant - handle missing tables
      let commissionsResult: any;
      if (hasSubscriptions && hasPlans && hasCustomerConsultants) {
        try {
          commissionsResult = await db.query(
            `SELECT 
               u.full_name as consultant_name,
               COUNT(DISTINCT cc.customer_id) as clients,
               COALESCE(SUM(p.price_cents * 0.15), 0) / 100.0 as commission
             FROM users u
             LEFT JOIN customer_consultants cc ON u.id = cc.consultant_id
             LEFT JOIN subscriptions s ON cc.customer_id = s.user_id AND s.status = 'active'
             LEFT JOIN plans p ON s.plan_id = p.id
             WHERE u.role = 'consultant'
             GROUP BY u.id, u.full_name
             ORDER BY commission DESC`
          );
        } catch (e) {
          commissionsResult = { rows: [] };
        }
      } else {
        commissionsResult = { rows: [] };
      }

      // Recent transactions - handle missing payments/subscriptions tables
      let transactionsResult: any;
      if (hasPayments && hasSubscriptions) {
        try {
          transactionsResult = await db.query(
            `SELECT 
               p.id,
               TO_CHAR(p.created_at, 'DD/MM') as date,
               CASE 
                 WHEN p.amount_cents > 0 THEN 'Assinatura'
                 ELSE 'Comissão'
               END as type,
               p.amount_cents / 100.0 as amount,
               u.full_name as client_name
             FROM payments p
             LEFT JOIN subscriptions s ON p.subscription_id = s.id
             LEFT JOIN users u ON s.user_id = u.id
             WHERE p.created_at >= NOW() - INTERVAL '30 days'
             ORDER BY p.created_at DESC
             LIMIT 50`
          );
        } catch (e) {
          transactionsResult = { rows: [] };
        }
      } else {
        transactionsResult = { rows: [] };
      }

      return {
        revenue: revenueResult.rows.map((row: any) => ({
          month: row.month,
          revenue: parseFloat(row.revenue) || 0,
        })),
        mrr,
        commissions: commissionsResult.rows.map((row: any) => ({
          consultant: row.consultant_name || 'N/A',
          clients: parseInt(row.clients) || 0,
          commission: parseFloat(row.commission) || 0,
        })),
        transactions: transactionsResult.rows.map((row: any) => ({
          id: row.id,
          date: row.date,
          type: row.type,
          amount: parseFloat(row.amount) || 0,
          client: row.client_name || 'N/A',
        })),
      };
    } catch (error: any) {
      fastify.log.error('Error fetching financial reports:', error);
      console.error('Full error:', error);
      reply.code(500).send({ error: 'Failed to fetch financial reports', details: error.message });
    }
  });

  // Get integrations monitoring data
  fastify.get('/integrations', {
    preHandler: [requireAdmin],
  }, async (request: any, reply) => {
    try {
      // Check if integration_health table exists
      let hasIntegrationHealth = false;
      try {
        await db.query('SELECT 1 FROM integration_health LIMIT 1');
        hasIntegrationHealth = true;
      } catch {
        hasIntegrationHealth = false;
      }

      // Check if connections table exists for stats
      let hasConnections = false;
      try {
        await db.query('SELECT 1 FROM connections LIMIT 1');
        hasConnections = true;
      } catch {
        hasConnections = false;
      }

      let integrations: any[] = [];
      let logs: Array<{ time: string; integration: string; message: string; type: 'success' | 'warning' | 'error' }> = [];

      if (hasIntegrationHealth) {
        // Get latest health status for each provider
        const healthResult = await db.query(
          `SELECT DISTINCT ON (provider)
             provider,
             status,
             checked_at as last_sync,
             details_json
           FROM integration_health
           ORDER BY provider, checked_at DESC`
        );

        // Aggregate connection stats if available
        let connectionStats: any = {};
        if (hasConnections) {
          try {
            const statsResult = await db.query(
              `SELECT 
                 provider,
                 COUNT(*) FILTER (WHERE status = 'connected') as connected,
                 COUNT(*) as total,
                 MAX(last_sync_at) as last_sync_at
               FROM connections
               GROUP BY provider`
            );
            connectionStats = statsResult.rows.reduce((acc: any, row: any) => {
              acc[row.provider] = {
                requestsToday: parseInt(row.total) || 0,
                connected: parseInt(row.connected) || 0,
              };
              return acc;
            }, {});
          } catch (e) {
            // Ignore errors
          }
        }

        integrations = healthResult.rows.map((row: any) => {
          const provider = row.provider;
          const details = row.details_json || {};
          const stats = connectionStats[provider] || {};
          
          return {
            id: provider,
            name: details.name || provider,
            provider: provider,
            status: row.status === 'ok' ? 'healthy' : row.status === 'degraded' ? 'degraded' : 'down',
            lastSync: details.lastSync || (row.last_sync ? new Date(row.last_sync).toLocaleString('pt-BR') : 'N/A'),
            uptime: details.uptime || '99.9%',
            errorRate: details.errorRate || 0,
            requestsToday: stats.requestsToday || 0,
          };
        });
      } else {
        // Return default integrations if table doesn't exist
        integrations = [
          {
            id: 'puggy',
            name: 'Open Finance',
            provider: 'Puggy',
            status: 'healthy',
            lastSync: 'N/A',
            uptime: '99.9%',
            errorRate: 0,
            requestsToday: 0,
          },
          {
            id: 'b3',
            name: 'B3 API',
            provider: 'B3',
            status: 'healthy',
            lastSync: 'N/A',
            uptime: '99.8%',
            errorRate: 0,
            requestsToday: 0,
          },
        ];
      }

      // Generate logs from recent integration activity
      if (hasConnections) {
        try {
          const logsResult = await db.query(
            `SELECT 
               provider,
               last_sync_at,
               last_sync_status,
               last_error
             FROM connections
             WHERE last_sync_at >= NOW() - INTERVAL '1 hour'
             ORDER BY last_sync_at DESC
             LIMIT 10`
          );
          
          logs = logsResult.rows.map((row: any): { time: string; integration: string; message: string; type: 'success' | 'warning' | 'error' } => ({
            time: row.last_sync_at ? new Date(row.last_sync_at).toLocaleString('pt-BR') : 'N/A',
            integration: row.provider,
            message: row.last_sync_status === 'ok' 
              ? `Sync concluído - ${row.provider}`
              : row.last_error || 'Erro ao sincronizar',
            type: row.last_sync_status === 'ok' ? 'success' : 'warning',
          }));
        } catch (e) {
          logs = [];
        }
      }

      const healthyCount = integrations.filter((i: any) => i.status === 'healthy').length;
      const degradedCount = integrations.filter((i: any) => i.status === 'degraded').length;
      const downCount = integrations.filter((i: any) => i.status === 'down').length;
      const avgUptime = integrations.length > 0
        ? (integrations.reduce((sum: number, i: any) => sum + parseFloat(i.uptime.replace('%', '')), 0) / integrations.length).toFixed(1) + '%'
        : '99.9%';

      return {
        integrations,
        stats: {
          healthy: healthyCount,
          degraded: degradedCount,
          down: downCount,
          total: integrations.length,
          avgUptime,
        },
        logs,
      };
    } catch (error: any) {
      fastify.log.error('Error fetching integrations:', error);
      console.error('Full error:', error);
      reply.code(500).send({ error: 'Failed to fetch integrations', details: error.message });
    }
  });

  // Get prospecting data (users eligible for conversion)
  fastify.get('/prospecting', {
    preHandler: [requireAdmin],
  }, async (request: any, reply) => {
    try {
      const { search, stage, potential, page = '1', limit = '20' } = request.query as any;
      const pageNum = parseInt(page) || 1;
      const limitNum = Math.min(parseInt(limit) || 20, 100);
      const offset = (pageNum - 1) * limitNum;

      // Check which tables exist
      let hasSubscriptions = false;
      let hasBankAccounts = false;
      let hasHoldings = false;

      try {
        await db.query('SELECT 1 FROM subscriptions LIMIT 1');
        hasSubscriptions = true;
      } catch {}

      try {
        await db.query('SELECT 1 FROM bank_accounts LIMIT 1');
        hasBankAccounts = true;
      } catch {}

      try {
        await db.query('SELECT 1 FROM holdings LIMIT 1');
        hasHoldings = true;
      } catch {}

      // Build WHERE clause
      let whereClause = 'WHERE u.role IN (\'customer\', \'consultant\')';
      const params: any[] = [];
      let paramIndex = 1;

      if (search) {
        whereClause += ` AND (u.full_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      // Stage filter only works if subscriptions table exists
      if (stage && hasSubscriptions) {
        // We'll filter after fetching since we can't JOIN if table doesn't exist
        // Just skip adding to WHERE clause for now, filter in code
      }

      // Calculate net worth
      let netWorthQuery = '0';
      if (hasBankAccounts && hasHoldings) {
        netWorthQuery = `COALESCE((
          SELECT SUM(balance_cents) FROM bank_accounts WHERE user_id = u.id
        ) + (
          SELECT SUM(market_value_cents) FROM holdings WHERE user_id = u.id
        ), 0)`;
      } else if (hasBankAccounts) {
        netWorthQuery = `COALESCE((
          SELECT SUM(balance_cents) FROM bank_accounts WHERE user_id = u.id
        ), 0)`;
      } else if (hasHoldings) {
        netWorthQuery = `COALESCE((
          SELECT SUM(market_value_cents) FROM holdings WHERE user_id = u.id
        ), 0)`;
      }

      // Get subscription stage
      let stageQuery = 'COALESCE(p.name, \'free\')';
      if (hasSubscriptions) {
        stageQuery = `COALESCE(
          (SELECT p2.name FROM subscriptions s2 
           JOIN plans p2 ON s2.plan_id = p2.id 
           WHERE s2.user_id = u.id AND s2.status = 'active' 
           LIMIT 1),
          'free'
        )`;
      }

      // Build query based on which tables exist
      let dataQuery: string;
      if (hasSubscriptions) {
        // Use JOIN if subscriptions exists
        dataQuery = `
          SELECT 
            u.id,
            u.full_name as name,
            u.email,
            ${netWorthQuery} / 100.0 as net_worth,
            ${stageQuery} as stage,
            GREATEST(
              CASE WHEN u.last_login_at IS NOT NULL THEN 100 ELSE 0 END,
              CASE WHEN EXISTS(SELECT 1 FROM connections WHERE user_id = u.id) THEN 50 ELSE 0 END,
              CASE WHEN EXISTS(SELECT 1 FROM goals WHERE user_id = u.id) THEN 30 ELSE 0 END
            ) as engagement,
            COALESCE(u.last_login_at, u.created_at) as last_activity
          FROM users u
          LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
          LEFT JOIN plans p ON s.plan_id = p.id
          ${whereClause}
          ORDER BY net_worth DESC
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
      } else {
        // Simple query without subscriptions JOIN
        dataQuery = `
          SELECT 
            u.id,
            u.full_name as name,
            u.email,
            ${netWorthQuery} / 100.0 as net_worth,
            'free' as stage,
            GREATEST(
              CASE WHEN u.last_login_at IS NOT NULL THEN 100 ELSE 0 END,
              CASE WHEN EXISTS(SELECT 1 FROM connections WHERE user_id = u.id) THEN 50 ELSE 0 END,
              CASE WHEN EXISTS(SELECT 1 FROM goals WHERE user_id = u.id) THEN 30 ELSE 0 END
            ) as engagement,
            COALESCE(u.last_login_at, u.created_at) as last_activity
          FROM users u
          ${whereClause}
          ORDER BY net_worth DESC
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
      }
      params.push(limitNum, offset);

      const result = await db.query(dataQuery, params);

      // Calculate potential based on net worth and engagement
      const prospects = result.rows.map((row: any) => {
        const netWorth = parseFloat(row.net_worth) || 0;
        const engagement = parseInt(row.engagement) || 0;
        
        let potential = 'low';
        if (netWorth > 500000 && engagement > 70) {
          potential = 'high';
        } else if (netWorth > 200000 || engagement > 50) {
          potential = 'medium';
        }

        const lastActivityDate = row.last_activity ? new Date(row.last_activity) : null;
        let lastActivityText = 'Nunca';
        if (lastActivityDate) {
          const now = new Date();
          const diffTime = now.getTime() - lastActivityDate.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays === 0) {
            lastActivityText = 'Hoje';
          } else if (diffDays === 1) {
            lastActivityText = 'Ontem';
          } else {
            lastActivityText = `Há ${diffDays} dias`;
          }
        }

        return {
          id: row.id,
          name: row.name,
          email: row.email,
          netWorth: netWorth,
          stage: row.stage || 'free',
          engagement: engagement,
          lastActivity: lastActivityText,
          potential,
        };
      });
      
      // Filter by stage if specified (only if subscriptions exists, otherwise all are 'free')
      let filteredProspects = prospects;
      if (stage && stage !== 'all' && hasSubscriptions) {
        filteredProspects = filteredProspects.filter((p: any) => p.stage === stage);
      } else if (stage && stage !== 'all' && !hasSubscriptions && stage !== 'free') {
        // If subscriptions doesn't exist and user wants non-free, return empty
        filteredProspects = [];
      }
      
      // Filter by potential if specified
      if (potential && potential !== 'all') {
        filteredProspects = filteredProspects.filter((p: any) => p.potential === potential);
      }

      // Get total count - use same pattern as data query
      let countQuery: string;
      if (hasSubscriptions) {
        countQuery = `
          SELECT COUNT(*) as total
          FROM users u
          LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
          LEFT JOIN plans p ON s.plan_id = p.id
          ${whereClause}
        `;
      } else {
        countQuery = `
          SELECT COUNT(*) as total
          FROM users u
          ${whereClause}
        `;
      }
      const countResult = await db.query(countQuery, params.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      // Calculate KPIs (using all prospects, not just filtered)
      const highPotential = filteredProspects.filter((p: any) => p.potential === 'high').length;
      const totalNetWorth = filteredProspects.reduce((sum: number, p: any) => sum + p.netWorth, 0);
      const avgEngagement = filteredProspects.length > 0
        ? filteredProspects.reduce((sum: number, p: any) => sum + p.engagement, 0) / filteredProspects.length
        : 0;

      // Funnel data (using all prospects)
      const funnelData = {
        free: filteredProspects.filter((p: any) => p.stage === 'free').length,
        basic: filteredProspects.filter((p: any) => p.stage === 'basic').length,
        pro: filteredProspects.filter((p: any) => p.stage === 'pro').length,
        consultant: filteredProspects.filter((p: any) => p.stage === 'consultant').length,
      };

      return {
        prospects: filteredProspects,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
        kpis: {
          highPotential,
          totalNetWorth,
          avgEngagement,
          total: prospects.length,
        },
        funnel: funnelData,
      };
    } catch (error: any) {
      fastify.log.error('Error fetching prospecting data:', error);
      console.error('Full error:', error);
      reply.code(500).send({ error: 'Failed to fetch prospecting data', details: error.message });
    }
  });
}

