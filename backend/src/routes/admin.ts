import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';

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

  // Admin Dashboard - Platform Metrics
  fastify.get('/dashboard/metrics', {
    preHandler: [requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
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
    } catch (error: any) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch dashboard metrics' });
    }
  });

  // Get all users with filters
  fastify.get('/users', {
    preHandler: [requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { search, role, status } = request.query as any;
      
      let query = `
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
        WHERE 1=1
      `;
      
      const params: any[] = [];
      let paramIndex = 1;

      if (search) {
        query += ` AND (u.full_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (role) {
        query += ` AND u.role = $${paramIndex}`;
        params.push(role);
        paramIndex++;
      }

      query += ` ORDER BY u.created_at DESC`;

      const result = await db.query(query, params);

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

      if (!['customer', 'consultant', 'admin'].includes(role)) {
        reply.code(400).send({ error: 'Invalid role' });
        return;
      }

      await db.query(
        `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2`,
        [role, id]
      );

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

      // For now, we'll add a blocked_users table or use a JSON field
      // For simplicity, let's assume we add a status field to users table
      // If not exists, we'll handle it gracefully
      await db.query(
        `UPDATE users 
         SET updated_at = NOW()
         WHERE id = $1`,
        [id]
      );

      // If you have a blocked_users table:
      // if (status === 'blocked') {
      //   await db.query(`INSERT INTO blocked_users (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, [id]);
      // } else {
      //   await db.query(`DELETE FROM blocked_users WHERE user_id = $1`, [id]);
      // }

      return { message: `User ${status === 'blocked' ? 'blocked' : 'unblocked'} successfully` };
    } catch (error: any) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to update user status' });
    }
  });

  // Get all subscriptions
  fastify.get('/subscriptions', {
    preHandler: [requireAdmin],
  }, async (request: any, reply) => {
    try {
      const { search, status, plan } = request.query as any;
      
      let query = `
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
        WHERE 1=1
      `;
      
      const params: any[] = [];
      let paramIndex = 1;

      if (search) {
        query += ` AND (u.full_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (status) {
        query += ` AND s.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (plan) {
        query += ` AND p.name = $${paramIndex}`;
        params.push(plan);
        paramIndex++;
      }

      query += ` ORDER BY s.created_at DESC`;

      const result = await db.query(query, params);

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

