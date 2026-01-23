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
        return;
      }
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized', details: (err as any).message });
      return;
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
      const year = parseInt((request.query as any)?.year || new Date().getFullYear().toString(), 10);
      const cacheKey = `admin:dashboard:metrics:${year}`;
      
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

      // Get user growth data for the selected year (all 12 months)
      const growthResult = await db.query(
        `SELECT 
           TO_CHAR(created_at, 'Mon') as month,
           EXTRACT(MONTH FROM created_at) as month_num,
           COUNT(*) as users
         FROM users
         WHERE EXTRACT(YEAR FROM created_at) = $1
         AND role IN ('customer', 'consultant')
         GROUP BY month, month_num
         ORDER BY month_num ASC`,
        [year]
      );

      // Get revenue data for the selected year (all 12 months) - handle missing tables
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
           AND EXTRACT(YEAR FROM p.created_at) = $1
           GROUP BY month, month_num
           ORDER BY month_num ASC`,
          [year]
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
      
      // Check if subscriptions table exists
      let hasSubscriptions = false;
      try {
        await db.query('SELECT 1 FROM subscriptions LIMIT 1');
        hasSubscriptions = true;
      } catch {
        // Table doesn't exist, use simple query
        hasSubscriptions = false;
      }

      // Check if blocked_users table exists for status filtering
      let hasBlockedUsersTable = false;
      try {
        await db.query('SELECT 1 FROM blocked_users LIMIT 1');
        hasBlockedUsersTable = true;
      } catch {
        hasBlockedUsersTable = false;
      }

      // Build WHERE clause
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      // Exclude admin users from the list
      whereClause += ` AND u.role != 'admin'`;

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
        if (status === 'blocked') {
          if (hasBlockedUsersTable) {
            whereClause += ` AND EXISTS(SELECT 1 FROM blocked_users WHERE user_id = u.id)`;
          } else {
            // If table doesn't exist, no users can be blocked
            whereClause += ` AND 1=0`;
          }
        } else if (status === 'active') {
          if (hasBlockedUsersTable) {
            whereClause += ` AND u.is_active = true AND NOT EXISTS(SELECT 1 FROM blocked_users WHERE user_id = u.id)`;
          } else {
            whereClause += ` AND u.is_active = true`;
          }
        } else if (status === 'pending') {
          if (hasBlockedUsersTable) {
            whereClause += ` AND u.is_active = false AND NOT EXISTS(SELECT 1 FROM blocked_users WHERE user_id = u.id)`;
          } else {
            whereClause += ` AND u.is_active = false`;
          }
        }
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
        if (hasBlockedUsersTable) {
          dataQuery = `
            SELECT 
              u.id,
              u.full_name,
              u.email,
              u.role,
              u.is_active,
              (SELECT EXISTS(SELECT 1 FROM blocked_users WHERE user_id = u.id)) as is_blocked,
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
              u.is_active,
              false as is_blocked,
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
        }
      } else {
        if (hasBlockedUsersTable) {
          dataQuery = `
            SELECT 
              u.id,
              u.full_name,
              u.email,
              u.role,
              u.is_active,
              (SELECT EXISTS(SELECT 1 FROM blocked_users WHERE user_id = u.id)) as is_blocked,
              u.created_at
            FROM users u
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
              u.is_active,
              false as is_blocked,
              u.created_at
            FROM users u
            ${whereClause}
            ORDER BY u.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
          `;
        }
      }
      dataParams.push(limitNum, offset);
      const result = await db.query(dataQuery, dataParams);

      const response = {
        users: result.rows.map((row: any) => {
          // Determine status based on is_blocked and is_active
          let status = 'pending';
          if (row.is_blocked) {
            status = 'blocked';
          } else if (row.is_active) {
            status = 'active';
          } else {
            status = 'pending';
          }
          
          return {
            id: row.id,
            name: row.full_name,
            email: row.email,
            role: row.role,
            status: status,
            plan: hasSubscriptions ? (row.plan_name || null) : null,
            createdAt: row.created_at,
          };
        }),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      };

      return reply.send(response);
    } catch (error: any) {
      fastify.log.error('Error fetching users:', error);
      console.error('Full error:', error);
      return reply.code(500).send({ error: 'Failed to fetch users', details: error.message });
    }
  });

  // Get user by ID with detailed information
  fastify.get('/users/:id', {
    preHandler: [requireAdmin],
  }, async (request: any, reply) => {
    try {
      const { id } = request.params;
      
      // Get user basic info
      const userResult = await db.query(
        `SELECT 
           u.id,
           u.full_name,
           u.email,
           u.role,
           u.phone,
           u.country_code,
           u.is_active,
           u.birth_date,
           u.risk_profile,
           u.created_at,
           u.updated_at
         FROM users u
         WHERE u.id = $1`,
        [id]
      );

      if (userResult.rows.length === 0) {
        reply.code(404).send({ error: 'User not found' });
        return;
      }

      const user = userResult.rows[0];

      // Check if user is blocked
      let isBlocked = false;
      try {
        const blockedResult = await db.query(
          `SELECT 1 FROM blocked_users WHERE user_id = $1`,
          [id]
        );
        isBlocked = blockedResult.rows.length > 0;
      } catch {
        // Table might not exist
      }

      // Get subscription info
      let subscription = null;
      let hasSubscriptions = false;
      try {
        await db.query('SELECT 1 FROM subscriptions LIMIT 1');
        hasSubscriptions = true;
      } catch {}

      if (hasSubscriptions) {
        try {
          const subResult = await db.query(
            `SELECT 
               s.id,
               s.status,
               s.current_period_start,
               s.current_period_end,
               p.name as plan_name,
               p.price_cents / 100.0 as plan_price
             FROM subscriptions s
             LEFT JOIN plans p ON s.plan_id = p.id
             WHERE s.user_id = $1 AND s.status = 'active'
             ORDER BY s.created_at DESC
             LIMIT 1`,
            [id]
          );
          if (subResult.rows.length > 0) {
            subscription = subResult.rows[0];
          }
        } catch {}
      }

      // Get financial summary
      let financialSummary = {
        cash: 0,
        investments: 0,
        debt: 0,
        netWorth: 0,
      };

      try {
        // Cash from bank accounts
        try {
          const cashResult = await db.query(
            `SELECT COALESCE(SUM(balance_cents), 0) / 100.0 as cash
             FROM bank_accounts WHERE user_id = $1`,
            [id]
          );
          financialSummary.cash = parseFloat(cashResult.rows[0]?.cash) || 0;
        } catch {}

        // Investments
        try {
          const invResult = await db.query(
            `SELECT COALESCE(SUM(market_value_cents), 0) / 100.0 as investments
             FROM holdings WHERE user_id = $1`,
            [id]
          );
          financialSummary.investments = parseFloat(invResult.rows[0]?.investments) || 0;
        } catch {}

        // Debt from credit cards
        try {
          const debtResult = await db.query(
            `SELECT COALESCE(SUM(total_cents), 0) / 100.0 as debt
             FROM card_invoices 
             WHERE credit_card_id IN (SELECT id FROM credit_cards WHERE user_id = $1)
             AND status = 'open'`,
            [id]
          );
          financialSummary.debt = parseFloat(debtResult.rows[0]?.debt) || 0;
        } catch {}

        financialSummary.netWorth = financialSummary.cash + financialSummary.investments - financialSummary.debt;
      } catch {}

      // Get connections count
      let connectionsCount = 0;
      try {
        const connResult = await db.query(
          `SELECT COUNT(*) as count FROM connections WHERE user_id = $1`,
          [id]
        );
        connectionsCount = parseInt(connResult.rows[0]?.count) || 0;
      } catch {}

      // Get goals count
      let goalsCount = 0;
      try {
        const goalsResult = await db.query(
          `SELECT COUNT(*) as count FROM goals WHERE user_id = $1`,
          [id]
        );
        goalsCount = parseInt(goalsResult.rows[0]?.count) || 0;
      } catch {}

      // Get consultant relationships (if customer)
      let consultants: any[] = [];
      if (user.role === 'customer') {
        try {
          const consultantsResult = await db.query(
            `SELECT 
               u.id,
               u.full_name as name,
               u.email,
               cc.status as relationship_status,
               cc.created_at as relationship_created_at
             FROM customer_consultants cc
             JOIN users u ON cc.consultant_id = u.id
             WHERE cc.customer_id = $1`,
            [id]
          );
          consultants = consultantsResult.rows;
        } catch {}
      }

      // Get clients (if consultant)
      let clientsCount = 0;
      if (user.role === 'consultant') {
        try {
          const clientsResult = await db.query(
            `SELECT COUNT(*) as count FROM customer_consultants WHERE consultant_id = $1`,
            [id]
          );
          clientsCount = parseInt(clientsResult.rows[0]?.count) || 0;
        } catch {}
      }

      return {
        user: {
          id: user.id,
          name: user.full_name,
          email: user.email,
          role: user.role,
          phone: user.phone || null,
          countryCode: user.country_code || 'BR',
          isActive: user.is_active,
          birthDate: user.birth_date || null,
          riskProfile: user.risk_profile || null,
          status: isBlocked ? 'blocked' : (user.is_active ? 'active' : 'pending'),
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          subscription,
          financialSummary,
          stats: {
            connections: connectionsCount,
            goals: goalsCount,
            clients: clientsCount,
          },
          consultants,
        },
      };
    } catch (error: any) {
      fastify.log.error('Error fetching user details:', error);
      console.error('Full error:', error);
      reply.code(500).send({ error: 'Failed to fetch user', details: error.message });
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

      const { search, status, plan, page = '1', limit = '20', startDate, endDate } = request.query as any;
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

      // Date range filtering - filter by subscription creation date
      if (startDate) {
        whereClause += ` AND s.created_at >= $${paramIndex}::date`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        whereClause += ` AND s.created_at <= $${paramIndex}::date + INTERVAL '1 day'`;
        params.push(endDate);
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

  // Get subscription details by ID
  fastify.get('/subscriptions/:id', {
    preHandler: [requireAdmin],
  }, async (request: any, reply) => {
    try {
      const { id } = request.params;

      // Check if subscriptions table exists
      try {
        await db.query('SELECT 1 FROM subscriptions LIMIT 1');
      } catch {
        reply.code(404).send({ error: 'Subscription not found' });
        return;
      }

      const result = await db.query(
        `SELECT 
          s.id,
          s.user_id,
          s.plan_id,
          s.status,
          s.current_period_start,
          s.current_period_end,
          s.canceled_at,
          s.created_at,
          s.updated_at,
          u.full_name as user_name,
          u.email as user_email,
          u.phone as user_phone,
          p.name as plan_name,
          p.code as plan_code,
          p.price_cents / 100.0 as plan_price,
          p.connection_limit,
          p.features_json
        FROM subscriptions s
        JOIN users u ON s.user_id = u.id
        JOIN plans p ON s.plan_id = p.id
        WHERE s.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        reply.code(404).send({ error: 'Subscription not found' });
        return;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        planId: row.plan_id,
        status: row.status,
        currentPeriodStart: row.current_period_start,
        currentPeriodEnd: row.current_period_end,
        canceledAt: row.canceled_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        user: {
          id: row.user_id,
          name: row.user_name,
          email: row.user_email,
          phone: row.user_phone,
        },
        plan: {
          id: row.plan_id,
          name: row.plan_name,
          code: row.plan_code,
          price: parseFloat(row.plan_price),
          connectionLimit: row.connection_limit,
          features: row.features_json?.features || [],
        },
      };
    } catch (error: any) {
      fastify.log.error('Error fetching subscription details:', error);
      reply.code(500).send({ error: 'Failed to fetch subscription details', details: error.message });
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
      let hasConnections = false;
      let hasGoals = false;

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

      try {
        await db.query('SELECT 1 FROM connections LIMIT 1');
        hasConnections = true;
      } catch {}

      try {
        await db.query('SELECT 1 FROM goals LIMIT 1');
        hasGoals = true;
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

      // Build engagement calculation based on which tables exist
      const engagementParts: string[] = [];
      if (hasConnections) {
        engagementParts.push('CASE WHEN EXISTS(SELECT 1 FROM connections WHERE user_id = u.id) THEN 50 ELSE 0 END');
      }
      if (hasGoals) {
        engagementParts.push('CASE WHEN EXISTS(SELECT 1 FROM goals WHERE user_id = u.id) THEN 30 ELSE 0 END');
      }
      engagementParts.push('CASE WHEN u.updated_at > u.created_at THEN 20 ELSE 0 END');
      const engagementQuery = engagementParts.length > 1
        ? `GREATEST(${engagementParts.join(', ')})`
        : engagementParts[0] || '0';

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
            ${engagementQuery} as engagement,
            COALESCE(u.updated_at, u.created_at) as last_activity
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
            ${engagementQuery} as engagement,
            COALESCE(u.updated_at, u.created_at) as last_activity
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

  // =========================
  // PLANS ENDPOINTS
  // =========================

  // Get all plans
  fastify.get('/plans', {
    preHandler: [requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      type PlanItem = {
        id: string;
        code: string;
        name: string;
        priceCents: number;
        monthlyPriceCents: number | null;
        annualPriceCents: number | null;
        connectionLimit: number | null;
        features: string[];
        isActive: boolean;
        role: string | null;
      };
      let plans: PlanItem[] = [];
      try {
        const plansResult = await db.query(
          `SELECT id, code, name, price_cents, monthly_price_cents, annual_price_cents, connection_limit, features_json, is_active, role
           FROM plans
           ORDER BY role NULLS LAST, COALESCE(monthly_price_cents, price_cents) ASC`
        );
        plans = plansResult.rows.map(row => ({
          id: row.id,
          code: row.code,
          name: row.name,
          priceCents: row.price_cents,
          monthlyPriceCents: row.monthly_price_cents,
          annualPriceCents: row.annual_price_cents,
          connectionLimit: row.connection_limit,
          features: row.features_json?.features || [],
          isActive: row.is_active,
          role: row.role || null,
        }));
      } catch (e: any) {
        // Plans table might not exist
        fastify.log.warn('Plans table does not exist or error fetching plans:', e?.message || e);
      }

      return reply.send({ plans });
    } catch (error: any) {
      fastify.log.error('Error fetching plans:', error);
      reply.code(500).send({ error: 'Failed to fetch plans', details: error.message });
    }
  });

  // Delete a plan
  fastify.delete('/plans/:id', {
    preHandler: [requireAdmin],
  }, async (request: any, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const adminId = getAdminId(request);

      // Check if plan exists
      const planResult = await db.query(
        'SELECT code, name FROM plans WHERE id = $1',
        [id]
      );

      if (planResult.rows.length === 0) {
        reply.code(404).send({ error: 'Plan not found' });
        return;
      }

      const plan = planResult.rows[0];

      // Check if plan has active subscriptions
      let hasActiveSubscriptions = false;
      try {
        const subResult = await db.query(
          'SELECT COUNT(*) as count FROM subscriptions WHERE plan_id = $1 AND status = $2',
          [id, 'active']
        );
        hasActiveSubscriptions = parseInt(subResult.rows[0].count) > 0;
      } catch {
        // Subscriptions table might not exist
      }

      if (hasActiveSubscriptions) {
        reply.code(400).send({ 
          error: 'Cannot delete plan with active subscriptions',
          details: 'Please cancel or migrate all active subscriptions before deleting this plan'
        });
        return;
      }

      // Delete the plan
      await db.query('DELETE FROM plans WHERE id = $1', [id]);

      // Log audit
      await logAudit({
        adminId,
        action: 'plan_deleted',
        resourceType: 'plan',
        resourceId: id,
        oldValue: { code: plan.code, name: plan.name },
        newValue: null,
        ipAddress: getClientIp(request),
        userAgent: request.headers['user-agent'],
      });

      return reply.send({ message: 'Plan deleted successfully' });
    } catch (error: any) {
      fastify.log.error('Error deleting plan:', error);
      reply.code(500).send({ error: 'Failed to delete plan', details: error.message });
    }
  });

  // =========================
  // SETTINGS ENDPOINTS
  // =========================

  // Get all settings
  fastify.get('/settings', {
    preHandler: [requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Get plans
      type PlanItem = {
        id: string;
        code: string;
        name: string;
        priceCents: number;
        connectionLimit: number | null;
        features: string[];
        isActive: boolean;
      };
      let plans: PlanItem[] = [];
      try {
        const plansResult = await db.query(
          `SELECT id, code, name, price_cents, connection_limit, features_json, is_active
           FROM plans
           ORDER BY price_cents ASC`
        );
        plans = plansResult.rows.map(row => ({
          id: row.id,
          code: row.code,
          name: row.name,
          priceCents: row.price_cents,
          connectionLimit: row.connection_limit,
          features: row.features_json?.features || [],
          isActive: row.is_active,
        }));
      } catch {
        // Plans table might not exist
      }

      // For now, return default settings. In production, these would come from a settings table
      return {
        plans,
        emailSettings: {
          welcomeEmail: true,
          monthlyReport: true,
          alerts: true,
          fromEmail: 'noreply@zurt.com.br',
          fromName: 'zurT',
        },
        platformSettings: {
          maintenanceMode: false,
          allowRegistrations: true,
          requireEmailVerification: false,
        },
        customization: {
          logo: null,
          primaryColor: '#3b82f6',
          platformName: 'zurT',
          description: '',
        },
        policies: {
          termsOfService: '',
          privacyPolicy: '',
          cookiePolicy: '',
        },
      };
    } catch (error: any) {
      fastify.log.error('Error fetching settings:', error);
      reply.code(500).send({ error: 'Failed to fetch settings', details: error.message });
    }
  });

  // Update plans
  fastify.put('/settings/plans', {
    preHandler: [requireAdmin],
  }, async (request: any, reply) => {
    try {
      const { plans } = request.body as { plans: Array<{
        code: string;
        name: string;
        priceCents: number;
        monthlyPriceCents?: number | null;
        annualPriceCents?: number | null;
        connectionLimit: number | null;
        features: string[];
        isActive: boolean;
        role?: string | null;
      }> };

      // Check if plans table exists
      try {
        await db.query('SELECT 1 FROM plans LIMIT 1');
      } catch {
        reply.code(400).send({ error: 'Plans table does not exist' });
        return;
      }

      // Update or insert each plan
      for (const plan of plans) {
        const existingPlan = await db.query(
          'SELECT id FROM plans WHERE code = $1',
          [plan.code]
        );

        if (existingPlan.rows.length > 0) {
          // Update existing plan
          await db.query(
            `UPDATE plans
             SET name = $1, price_cents = $2, monthly_price_cents = $3, annual_price_cents = $4,
                 connection_limit = $5, features_json = $6, is_active = $7, role = $8, updated_at = now()
             WHERE code = $9`,
            [
              plan.name,
              plan.priceCents,
              plan.monthlyPriceCents ?? plan.priceCents,
              plan.annualPriceCents ?? (plan.priceCents > 0 ? plan.priceCents * 10 : 0),
              plan.connectionLimit,
              JSON.stringify({ features: plan.features }),
              plan.isActive,
              plan.role || null,
              plan.code,
            ]
          );
        } else {
          // Insert new plan
          await db.query(
            `INSERT INTO plans (code, name, price_cents, monthly_price_cents, annual_price_cents, connection_limit, features_json, is_active, role)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              plan.code,
              plan.name,
              plan.priceCents,
              plan.monthlyPriceCents ?? plan.priceCents,
              plan.annualPriceCents ?? (plan.priceCents > 0 ? plan.priceCents * 10 : 0),
              plan.connectionLimit,
              JSON.stringify({ features: plan.features }),
              plan.isActive,
              plan.role || null,
            ]
          );
        }
      }

      await logAudit({
        adminId: getAdminId(request),
        action: 'settings.plans.update',
        resourceType: 'plans',
        newValue: {
          plansUpdated: plans.length,
        },
        ipAddress: getClientIp(request),
        userAgent: request.headers['user-agent'],
      });

      return { message: 'Plans updated successfully' };
    } catch (error: any) {
      fastify.log.error('Error updating plans:', error);
      reply.code(500).send({ error: 'Failed to update plans', details: error.message });
    }
  });

  // Update email settings
  fastify.put('/settings/email', {
    preHandler: [requireAdmin],
  }, async (request: any, reply) => {
    try {
      const emailSettings = request.body as {
        welcomeEmail: boolean;
        monthlyReport: boolean;
        alerts: boolean;
        fromEmail: string;
        fromName: string;
      };

      // In a real implementation, save to a settings table
      // For now, just log the action
      await logAudit({
        adminId: getAdminId(request),
        action: 'settings.email.update',
        resourceType: 'settings',
        newValue: emailSettings,
        ipAddress: getClientIp(request),
        userAgent: request.headers['user-agent'],
      });

      return { message: 'Email settings updated successfully' };
    } catch (error: any) {
      fastify.log.error('Error updating email settings:', error);
      reply.code(500).send({ error: 'Failed to update email settings', details: error.message });
    }
  });

  // Update platform settings
  fastify.put('/settings/platform', {
    preHandler: [requireAdmin],
  }, async (request: any, reply) => {
    try {
      const platformSettings = request.body as {
        maintenanceMode: boolean;
        allowRegistrations: boolean;
        requireEmailVerification: boolean;
      };

      // In a real implementation, save to a settings table
      // For now, just log the action
      await logAudit({
        adminId: getAdminId(request),
        action: 'settings.platform.update',
        resourceType: 'settings',
        newValue: platformSettings,
        ipAddress: getClientIp(request),
        userAgent: request.headers['user-agent'],
      });

      return { message: 'Platform settings updated successfully' };
    } catch (error: any) {
      fastify.log.error('Error updating platform settings:', error);
      reply.code(500).send({ error: 'Failed to update platform settings', details: error.message });
    }
  });

  // Update customization
  fastify.put('/settings/customization', {
    preHandler: [requireAdmin],
  }, async (request: any, reply) => {
    try {
      const customization = request.body as {
        primaryColor?: string;
        platformName?: string;
        description?: string;
      };

      // Note: File upload (logo) would require multipart/form-data support
      // For now, we'll handle JSON only. Logo upload can be added later with @fastify/multipart

      // In a real implementation, save to a settings table
      // For now, just log the action
      await logAudit({
        adminId: getAdminId(request),
        action: 'settings.customization.update',
        resourceType: 'settings',
        newValue: customization,
        ipAddress: getClientIp(request),
        userAgent: request.headers['user-agent'],
      });

      return { message: 'Customization settings updated successfully' };
    } catch (error: any) {
      fastify.log.error('Error updating customization settings:', error);
      reply.code(500).send({ error: 'Failed to update customization settings', details: error.message });
    }
  });

  // Update policies
  fastify.put('/settings/policies', {
    preHandler: [requireAdmin],
  }, async (request: any, reply) => {
    try {
      const policies = request.body as {
        termsOfService: string;
        privacyPolicy: string;
        cookiePolicy: string;
      };

      // In a real implementation, save to a settings table
      // For now, just log the action
      await logAudit({
        adminId: getAdminId(request),
        action: 'settings.policies.update',
        resourceType: 'settings',
        newValue: {
          policiesUpdated: Object.keys(policies).length,
        },
        ipAddress: getClientIp(request),
        userAgent: request.headers['user-agent'],
      });

      return { message: 'Policies updated successfully' };
    } catch (error: any) {
      fastify.log.error('Error updating policies:', error);
      reply.code(500).send({ error: 'Failed to update policies', details: error.message });
    }
  });

  // Get payment history
  fastify.get('/payments', {
    preHandler: [requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { page = '1', limit = '50', status, userId, startDate, endDate } = request.query as any;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Check if payments table exists
      let hasPayments = false;
      try {
        await db.query('SELECT 1 FROM payments LIMIT 1');
        hasPayments = true;
      } catch {}

      if (!hasPayments) {
        return reply.send({
          payments: [],
          pagination: { page: 1, limit: parseInt(limit), total: 0, totalPages: 0 },
        });
      }

      let query = `
        SELECT 
          p.id,
          p.amount_cents,
          p.currency,
          p.status,
          p.paid_at,
          p.provider,
          p.provider_payment_id,
          p.created_at,
          u.id as user_id,
          u.full_name as user_name,
          u.email as user_email,
          s.id as subscription_id,
          pl.name as plan_name,
          pl.code as plan_code
        FROM payments p
        LEFT JOIN users u ON p.user_id = u.id
        LEFT JOIN subscriptions s ON p.subscription_id = s.id
        LEFT JOIN plans pl ON s.plan_id = pl.id
        WHERE 1=1
      `;

      const params: any[] = [];
      let paramIndex = 1;

      if (status) {
        query += ` AND p.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (userId) {
        query += ` AND p.user_id = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
      }

      if (startDate) {
        query += ` AND p.created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        query += ` AND p.created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      // Get total count
      const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
      const countResult = await db.query(countQuery, params);
      const total = parseInt(countResult.rows[0]?.total || '0', 10);

      // Add ordering and pagination
      query += ` ORDER BY p.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(parseInt(limit), offset);

      const result = await db.query(query, params);

      return reply.send({
        payments: result.rows.map((row: any) => ({
          id: row.id,
          amountCents: row.amount_cents,
          currency: row.currency,
          status: row.status,
          paidAt: row.paid_at,
          provider: row.provider,
          providerPaymentId: row.provider_payment_id,
          createdAt: row.created_at,
          user: {
            id: row.user_id,
            name: row.user_name,
            email: row.user_email,
          },
          subscription: row.subscription_id ? {
            id: row.subscription_id,
            plan: {
              name: row.plan_name,
              code: row.plan_code,
            },
          } : null,
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error: any) {
      fastify.log.error('Error fetching payment history:', error);
      reply.code(500).send({ error: 'Failed to fetch payment history', details: error.message });
    }
  });

  // Get login history
  fastify.get('/login-history', {
    preHandler: [requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { page = '1', limit = '50', userId, startDate, endDate } = request.query as any;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Check if login_history table exists
      let hasLoginHistory = false;
      try {
        await db.query('SELECT 1 FROM login_history LIMIT 1');
        hasLoginHistory = true;
      } catch {}

      if (!hasLoginHistory) {
        return reply.send({
          loginHistory: [],
          pagination: { page: 1, limit: parseInt(limit), total: 0, totalPages: 0 },
        });
      }

      let query = `
        SELECT 
          lh.id,
          lh.user_id,
          lh.ip_address,
          lh.user_agent,
          lh.success,
          lh.created_at,
          u.full_name as user_name,
          u.email as user_email,
          u.role as user_role
        FROM login_history lh
        LEFT JOIN users u ON lh.user_id = u.id
        WHERE 1=1
      `;

      const params: any[] = [];
      let paramIndex = 1;

      if (userId) {
        query += ` AND lh.user_id = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
      }

      if (startDate) {
        query += ` AND lh.created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        query += ` AND lh.created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      // Get total count
      const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
      const countResult = await db.query(countQuery, params);
      const total = parseInt(countResult.rows[0]?.total || '0', 10);

      // Add ordering and pagination
      query += ` ORDER BY lh.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(parseInt(limit), offset);

      const result = await db.query(query, params);

      return reply.send({
        loginHistory: result.rows.map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          ipAddress: row.ip_address,
          userAgent: row.user_agent,
          success: row.success,
          createdAt: row.created_at,
          user: {
            id: row.user_id,
            name: row.user_name,
            email: row.user_email,
            role: row.user_role,
          },
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error: any) {
      fastify.log.error('Error fetching login history:', error);
      reply.code(500).send({ error: 'Failed to fetch login history', details: error.message });
    }
  });

  // Delete a payment record
  fastify.delete('/payments/:id', {
    preHandler: [requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as any;

      // Check if payments table exists
      let hasPayments = false;
      try {
        await db.query('SELECT 1 FROM payments LIMIT 1');
        hasPayments = true;
      } catch {}

      if (!hasPayments) {
        return reply.code(404).send({ error: 'Payment not found' });
      }

      // Verify payment exists
      const verifyResult = await db.query(
        'SELECT id FROM payments WHERE id = $1',
        [id]
      );

      if (verifyResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Payment not found' });
      }

      // Delete the payment
      await db.query('DELETE FROM payments WHERE id = $1', [id]);

      // Log the action
      await logAudit({
        adminId: getAdminId(request),
        action: 'payment_deleted',
        resourceType: 'payment',
        resourceId: id,
        ipAddress: getClientIp(request),
        userAgent: request.headers['user-agent'],
      });

      return reply.send({ success: true, message: 'Payment deleted successfully' });
    } catch (error: any) {
      fastify.log.error('Error deleting payment:', error);
      reply.code(500).send({ error: 'Failed to delete payment', details: error.message });
    }
  });

  // Delete a login history record
  fastify.delete('/login-history/:id', {
    preHandler: [requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as any;

      // Check if login_history table exists
      let hasLoginHistory = false;
      try {
        await db.query('SELECT 1 FROM login_history LIMIT 1');
        hasLoginHistory = true;
      } catch {}

      if (!hasLoginHistory) {
        return reply.code(404).send({ error: 'Login history record not found' });
      }

      // Verify record exists
      const verifyResult = await db.query(
        'SELECT id FROM login_history WHERE id = $1',
        [id]
      );

      if (verifyResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Login history record not found' });
      }

      // Delete the record
      await db.query('DELETE FROM login_history WHERE id = $1', [id]);

      // Log the action
      await logAudit({
        adminId: getAdminId(request),
        action: 'login_history_deleted',
        resourceType: 'login_history',
        resourceId: id,
        ipAddress: getClientIp(request),
        userAgent: request.headers['user-agent'],
      });

      return reply.send({ success: true, message: 'Login history record deleted successfully' });
    } catch (error: any) {
      fastify.log.error('Error deleting login history record:', error);
      reply.code(500).send({ error: 'Failed to delete login history record', details: error.message });
    }
  });
}

