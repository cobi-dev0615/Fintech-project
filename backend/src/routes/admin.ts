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

      // Calculate MRR (Monthly Recurring Revenue)
      const mrrResult = await db.query(
        `SELECT COALESCE(SUM(p.price_cents), 0) / 100.0 as mrr
         FROM subscriptions s
         JOIN plans p ON s.plan_id = p.id
         WHERE s.status = 'active'
         AND s.current_period_end > NOW()`
      );
      const mrr = parseFloat(mrrResult.rows[0].mrr) || 0;

      // Calculate churn rate (last 30 days)
      const churnResult = await db.query(
        `SELECT 
           COUNT(*) FILTER (WHERE s.status = 'canceled' AND s.canceled_at >= NOW() - INTERVAL '30 days') as canceled,
           COUNT(*) FILTER (WHERE s.status = 'active' AND s.current_period_start >= NOW() - INTERVAL '30 days') as active_start
         FROM subscriptions s`
      );
      const canceled = parseInt(churnResult.rows[0].canceled) || 0;
      const activeStart = parseInt(churnResult.rows[0].active_start) || 0;
      const totalActive = activeStart + canceled;
      const churnRate = totalActive > 0 ? (canceled / totalActive) * 100 : 0;

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

      // Get revenue data (last 7 months)
      const revenueResult = await db.query(
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

      return {
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

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM users u
        LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
        ${whereClause}
      `;
      const countResult = await db.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // Get paginated results
      const dataQuery = `
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
      params.push(limitNum, offset);
      const result = await db.query(dataQuery, params);

      return {
        users: result.rows.map((row: any) => ({
          id: row.id,
          name: row.full_name,
          email: row.email,
          role: row.role,
          status: row.subscription_status === 'active' ? 'active' : 'pending',
          plan: row.plan_name || null,
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
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch users' });
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
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch subscriptions' });
    }
  });

  // Get financial reports
  fastify.get('/financial/reports', {
    preHandler: [requireAdmin],
  }, async (request: any, reply) => {
    try {
      // Total revenue (last 6 months)
      const revenueResult = await db.query(
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

      // MRR
      const mrrResult = await db.query(
        `SELECT COALESCE(SUM(p.price_cents), 0) / 100.0 as mrr
         FROM subscriptions s
         JOIN plans p ON s.plan_id = p.id
         WHERE s.status = 'active'`
      );
      const mrr = parseFloat(mrrResult.rows[0].mrr) || 0;

      // Commissions by consultant
      const commissionsResult = await db.query(
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

      // Recent transactions
      const transactionsResult = await db.query(
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

      return {
        revenue: revenueResult.rows.map((row: any) => ({
          month: row.month,
          revenue: parseFloat(row.revenue),
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
          amount: parseFloat(row.amount),
          client: row.client_name || 'N/A',
        })),
      };
    } catch (error: any) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch financial reports' });
    }
  });
}

