import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';
import { cache } from '../utils/cache.js';
import { logAudit, getClientIp } from '../utils/audit.js';
import { createAlert } from '../utils/notifications.js';

export async function adminRoutes(fastify: FastifyInstance) {
  // Add enabled column to institutions if it doesn't exist
  try {
    await db.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'institutions' AND column_name = 'enabled'
        ) THEN
          ALTER TABLE institutions ADD COLUMN enabled BOOLEAN NOT NULL DEFAULT true;
        END IF;
      END $$;
    `);
  } catch (err) {
    fastify.log.warn('Error checking/adding enabled column to institutions:', err);
  }
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

      // --- Previous month comparisons for growth rates ---

      // Previous month total users (total at end of last month)
      const prevTotalUsersResult = await db.query(
        `SELECT COUNT(*) as count FROM users
         WHERE role IN ('customer', 'consultant')
         AND created_at < DATE_TRUNC('month', CURRENT_DATE)`
      );
      const prevTotalUsers = parseInt(prevTotalUsersResult.rows[0].count) || 0;

      // Previous month new users
      const prevNewUsersResult = await db.query(
        `SELECT COUNT(*) as count FROM users
         WHERE role IN ('customer', 'consultant')
         AND created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
         AND created_at < DATE_TRUNC('month', CURRENT_DATE)`
      );
      const prevNewUsers = parseInt(prevNewUsersResult.rows[0].count) || 0;

      // Previous month MRR (revenue from payments in the previous month)
      let prevMrr = 0;
      try {
        const prevMrrResult = await db.query(
          `SELECT COALESCE(SUM(p.amount_cents), 0) / 100.0 as revenue
           FROM payments p
           JOIN subscriptions s ON p.subscription_id = s.id
           WHERE p.status = 'paid'
           AND p.created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
           AND p.created_at < DATE_TRUNC('month', CURRENT_DATE)`
        );
        prevMrr = parseFloat(prevMrrResult.rows[0].revenue) || 0;
      } catch (e) {
        prevMrr = 0;
      }

      // Previous month churn rate
      let prevChurnRate = 0;
      try {
        const prevChurnResult = await db.query(
          `SELECT
             COUNT(*) FILTER (WHERE s.status = 'canceled'
               AND s.canceled_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
               AND s.canceled_at < DATE_TRUNC('month', CURRENT_DATE)) as canceled,
             COUNT(*) FILTER (WHERE s.current_period_start >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
               AND s.current_period_start < DATE_TRUNC('month', CURRENT_DATE)) as active_start
           FROM subscriptions s`
        );
        const prevCanceled = parseInt(prevChurnResult.rows[0].canceled) || 0;
        const prevActiveStart = parseInt(prevChurnResult.rows[0].active_start) || 0;
        const prevTotal = prevActiveStart + prevCanceled;
        prevChurnRate = prevTotal > 0 ? (prevCanceled / prevTotal) * 100 : 0;
      } catch (e) {
        prevChurnRate = 0;
      }

      // Calculate growth percentages
      const calcGrowth = (current: number, previous: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return parseFloat(((current - previous) / previous * 100).toFixed(1));
      };

      const usersGrowth = calcGrowth(activeUsers, prevTotalUsers);
      const newUsersGrowth = calcGrowth(newUsers, prevNewUsers);
      const mrrGrowth = calcGrowth(mrr, prevMrr);
      const churnGrowth = parseFloat((churnRate - prevChurnRate).toFixed(2));

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

      // Recent registrations (latest 5)
      const recentRegResult = await db.query(
        `SELECT id, full_name, email, role, created_at
         FROM users
         WHERE role IN ('customer', 'consultant')
         ORDER BY created_at DESC
         LIMIT 5`
      );

      // User role distribution
      const roleDistResult = await db.query(
        `SELECT role, COUNT(*) as count
         FROM users
         WHERE role IN ('customer', 'consultant')
         GROUP BY role`
      );

      // Pending approvals count
      let pendingApprovals = 0;
      try {
        const pendingResult = await db.query(
          `SELECT COUNT(*) as count FROM users WHERE approval_status = 'pending'`
        );
        pendingApprovals = parseInt(pendingResult.rows[0].count) || 0;
      } catch (e) {
        pendingApprovals = 0;
      }

      // Subscription stats
      let subscriptionStats = { total: 0, active: 0, canceled: 0, trialing: 0, pastDue: 0, paused: 0 };
      try {
        const subStatsResult = await db.query(
          `SELECT
             COUNT(*) as total,
             COUNT(*) FILTER (WHERE status = 'active') as active,
             COUNT(*) FILTER (WHERE status = 'canceled') as canceled,
             COUNT(*) FILTER (WHERE status = 'trialing') as trialing,
             COUNT(*) FILTER (WHERE status = 'past_due') as past_due,
             COUNT(*) FILTER (WHERE status = 'paused') as paused
           FROM subscriptions`
        );
        subscriptionStats = {
          total: parseInt(subStatsResult.rows[0].total) || 0,
          active: parseInt(subStatsResult.rows[0].active) || 0,
          canceled: parseInt(subStatsResult.rows[0].canceled) || 0,
          trialing: parseInt(subStatsResult.rows[0].trialing) || 0,
          pastDue: parseInt(subStatsResult.rows[0].past_due) || 0,
          paused: parseInt(subStatsResult.rows[0].paused) || 0,
        };
      } catch (e) {
        // subscriptions table may not exist
      }

      // Recent system notifications (latest 5)
      let recentNotifResult;
      try {
        recentNotifResult = await db.query(
          `SELECT id, type, severity, message, resolved, created_at
           FROM system_alerts
           ORDER BY created_at DESC
           LIMIT 5`
        );
      } catch (e) {
        recentNotifResult = { rows: [] };
      }

      // Connections overview by status
      let connOverviewResult;
      try {
        connOverviewResult = await db.query(
          `SELECT status, COUNT(*) as count FROM connections GROUP BY status`
        );
      } catch (e) {
        connOverviewResult = { rows: [] };
      }

      const result = {
        kpis: {
          activeUsers,
          newUsers,
          mrr,
          churnRate: parseFloat(churnRate.toFixed(2)),
          usersGrowth,
          newUsersGrowth,
          mrrGrowth,
          churnGrowth,
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
        recentRegistrations: recentRegResult.rows.map(row => ({
          id: row.id,
          name: row.full_name,
          email: row.email,
          role: row.role,
          createdAt: row.created_at,
        })),
        roleDistribution: roleDistResult.rows.map(row => ({
          role: row.role,
          count: parseInt(row.count),
        })),
        pendingApprovals,
        subscriptionStats,
        recentNotifications: recentNotifResult.rows.map((row: any) => ({
          id: row.id,
          type: row.type,
          severity: row.severity,
          message: row.message,
          resolved: row.resolved,
          time: row.created_at,
        })),
        connectionsByStatus: connOverviewResult.rows.map((row: any) => ({
          status: row.status,
          count: parseInt(row.count),
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
              COALESCE(u.approval_status, 'approved') as approval_status,
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
              COALESCE(u.approval_status, 'approved') as approval_status,
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
              COALESCE(u.approval_status, 'approved') as approval_status,
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
              COALESCE(u.approval_status, 'approved') as approval_status,
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
          // Determine status based on is_blocked, is_active, and approval_status
          const approvalStatus = row.approval_status || 'approved'; // Default to approved for legacy users
          let status = 'pending';
          
          if (row.is_blocked) {
            status = 'blocked';
          } else if (approvalStatus === 'approved') {
            // If user is approved, they should be active (even if is_active is false, we show as active)
            // This handles the case where approval_status = 'approved' but is_active = false
            status = 'active';
          } else if (row.is_active) {
            // Legacy case: user is active but approval_status might be null or pending
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

  // Get customer full finance info from Open Finance (admin view)
  fastify.get('/users/:id/finance', {
    preHandler: [requireAdmin],
  }, async (request: any, reply) => {
    try {
      const { id } = request.params;

      const userCheck = await db.query(
        `SELECT id, full_name, email, role FROM users WHERE id = $1`,
        [id]
      );
      if (userCheck.rows.length === 0) {
        reply.code(404).send({ error: 'User not found' });
        return;
      }
      const userRow = userCheck.rows[0];
      if (userRow.role !== 'customer') {
        reply.code(400).send({ error: 'Finance data is only available for customers' });
        return;
      }

      const user = { id: userRow.id, name: userRow.full_name, email: userRow.email };

      // Connections
      let connections: any[] = [];
      try {
        const connResult = await db.query(
          `SELECT DISTINCT ON (c.institution_id)
                  c.id, c.external_consent_id as item_id, c.status, c.last_sync_at, c.last_sync_status,
                  i.name as institution_name, i.logo_url as institution_logo
           FROM connections c
           LEFT JOIN institutions i ON c.institution_id = i.id
           WHERE c.user_id = $1 AND c.provider = 'open_finance'
           ORDER BY c.institution_id, c.created_at DESC`,
          [id]
        );
        connections = connResult.rows;
      } catch {}

      // Accounts (pluggy_accounts)
      let accounts: any[] = [];
      let totalCash = 0;
      try {
        const accResult = await db.query(
          `SELECT pa.*, i.name as institution_name, i.logo_url as institution_logo
           FROM pluggy_accounts pa
           LEFT JOIN connections c ON pa.item_id = c.external_consent_id AND c.user_id = pa.user_id
           LEFT JOIN institutions i ON c.institution_id = i.id
           WHERE pa.user_id = $1
           ORDER BY pa.updated_at DESC`,
          [id]
        );
        accounts = accResult.rows;
        for (const a of accResult.rows) {
          totalCash += parseFloat(a.current_balance || 0);
        }
      } catch {}

      // Investments (pluggy_investments)
      let investments: any[] = [];
      let totalInvestments = 0;
      const breakdown: any[] = [];
      const byType: any = {};
      try {
        const invResult = await db.query(
          `SELECT pi.*, i.name as institution_name
           FROM pluggy_investments pi
           LEFT JOIN connections c ON pi.item_id = c.external_consent_id AND c.user_id = pi.user_id
           LEFT JOIN institutions i ON c.institution_id = i.id
           WHERE pi.user_id = $1
           ORDER BY pi.updated_at DESC`,
          [id]
        );
        investments = invResult.rows;
        for (const inv of invResult.rows) {
          const val = parseFloat(inv.current_value || 0);
          totalInvestments += val;
          const type = inv.type || 'other';
          if (!byType[type]) byType[type] = { type, count: 0, total: 0 };
          byType[type].count++;
          byType[type].total += val;
        }
        breakdown.push(...Object.values(byType));
      } catch {}

      // Cards (pluggy_credit_cards + invoices)
      let cards: any[] = [];
      let totalDebt = 0;
      try {
        const cardResult = await db.query(
          `SELECT pc.*, i.name as institution_name
           FROM pluggy_credit_cards pc
           LEFT JOIN connections c ON pc.item_id = c.external_consent_id AND c.user_id = pc.user_id
           LEFT JOIN institutions i ON c.institution_id = i.id
           WHERE pc.user_id = $1
           ORDER BY pc.updated_at DESC`,
          [id]
        );
        const seenCards = new Set<string>();
        for (const card of cardResult.rows) {
          // Deduplicate by brand + last4 (multiple connections can sync the same physical card)
          const dedupKey = `${(card.brand || '').toLowerCase()}-${card.last4 || ''}`;
          if (seenCards.has(dedupKey)) continue;
          seenCards.add(dedupKey);

          const invResult = await db.query(
            `SELECT due_date, amount, status FROM pluggy_card_invoices
             WHERE pluggy_card_id = $1 AND user_id = $2 AND status = 'open'
             ORDER BY due_date DESC LIMIT 1`,
            [card.pluggy_card_id, id]
          );
          const inv = invResult.rows[0];
          const debt = inv ? parseFloat(inv.amount || 0) : 0;
          totalDebt += debt;
          cards.push({
            ...card,
            latestInvoice: inv || null,
            openDebt: debt,
          });
        }
      } catch {}

      // Recent transactions (last 100)
      let transactions: any[] = [];
      try {
        const txResult = await db.query(
          `SELECT pt.*, pa.name as account_name, i.name as institution_name
           FROM pluggy_transactions pt
           LEFT JOIN pluggy_accounts pa ON pt.pluggy_account_id = pa.pluggy_account_id AND pt.user_id = pa.user_id
           LEFT JOIN connections c ON pt.item_id = c.external_consent_id AND c.user_id = pt.user_id
           LEFT JOIN institutions i ON c.institution_id = i.id
           WHERE pt.user_id = $1
           ORDER BY pt.date DESC, pt.created_at DESC
           LIMIT 100`,
          [id]
        );
        transactions = txResult.rows;
      } catch {}

      const netWorth = totalCash + totalInvestments - totalDebt;

      return reply.send({
        user,
        summary: { cash: totalCash, investments: totalInvestments, debt: totalDebt, netWorth },
        connections,
        accounts,
        investments,
        breakdown,
        cards,
        transactions,
      });
    } catch (error: any) {
      fastify.log.error('Error fetching customer finance:', error);
      reply.code(500).send({ error: 'Failed to fetch finance data', details: error.message });
    }
  });

  // Get user investments/portfolio (admin view)
  fastify.get('/users/:id/investments', {
    preHandler: [requireAdmin],
  }, async (request: any, reply) => {
    try {
      const { id } = request.params;
      const { itemId } = request.query as any;

      // Verify user exists
      const userCheck = await db.query('SELECT id, full_name FROM users WHERE id = $1', [id]);
      if (userCheck.rows.length === 0) {
        reply.code(404).send({ error: 'User not found' });
        return;
      }

      let query = `
        SELECT 
          pi.*,
          c.external_consent_id as item_id,
          i.name as institution_name,
          i.logo_url as institution_logo
        FROM pluggy_investments pi
        LEFT JOIN connections c ON pi.item_id = c.external_consent_id AND c.user_id = pi.user_id
        LEFT JOIN institutions i ON c.institution_id = i.id
        WHERE pi.user_id = $1
      `;
      const params: any[] = [id];

      if (itemId) {
        query += ' AND pi.item_id = $2';
        params.push(itemId);
      }

      query += ' ORDER BY pi.updated_at DESC';

      const result = await db.query(query, params);

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
        user: { id: userCheck.rows[0].id, name: userCheck.rows[0].full_name },
        investments: result.rows,
        total: totalValue,
        breakdown: Object.values(byType),
      });
    } catch (error: any) {
      fastify.log.error('Error fetching user investments:', error);
      reply.code(500).send({ error: 'Failed to fetch investments', details: error.message });
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

  // Approve user registration
  fastify.patch('/users/:id/approve', {
    preHandler: [requireAdmin],
  }, async (request: any, reply) => {
    try {
      const { id } = request.params;
      const adminId = getAdminId(request);

      // Get user info including is_active
      const userResult = await db.query(
        `SELECT id, full_name, email, role, COALESCE(approval_status, 'approved') as approval_status, is_active FROM users WHERE id = $1`,
        [id]
      );

      if (userResult.rows.length === 0) {
        return reply.code(404).send({ error: 'User not found' });
      }

      const user = userResult.rows[0];

      // If user is already approved and active, return success (idempotent)
      if (user.approval_status === 'approved' && user.is_active) {
        return reply.send({ 
          message: 'User is already approved and active',
          user: {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            approval_status: 'approved',
            is_active: true,
          },
        });
      }

      // If user is approved but not active, just activate them
      if (user.approval_status === 'approved' && !user.is_active) {
        await db.query(
          `UPDATE users SET is_active = true, updated_at = NOW() WHERE id = $1`,
          [id]
        );
        
        return reply.send({ 
          message: 'User activated successfully',
          user: {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            approval_status: 'approved',
            is_active: true,
          },
        });
      }

      // Update approval status and activate user
      await db.query(
        `UPDATE users SET approval_status = 'approved', is_active = true, updated_at = NOW() WHERE id = $1`,
        [id]
      );

      // Log audit
      await logAudit({
        adminId,
        action: 'user_approved',
        resourceType: 'user',
        resourceId: id,
        oldValue: { approval_status: user.approval_status },
        newValue: { approval_status: 'approved' },
        ipAddress: getClientIp(request),
        userAgent: request.headers['user-agent'],
      });

      // Notify the user about approval
      try {
        await createAlert({
          userId: id,
          severity: 'info',
          title: 'Conta Aprovada',
          message: 'Sua solicitação de registro foi aprovada. Você já pode fazer login no sistema.',
          notificationType: 'account_activity',
          linkUrl: '/login',
          metadata: {
            adminId,
            action: 'approved',
            titleKey: 'websocket.accountApproved',
            messageKey: 'websocket.accountApprovedDesc',
            messageParams: {},
          },
        });

        // Broadcast to the user via WebSocket
        const websocket = (fastify as any).websocket;
        if (websocket && websocket.broadcastToUser) {
          websocket.broadcastToUser(id, {
            type: 'account_approved',
            message: 'Sua conta foi aprovada',
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        fastify.log.error({ err: error }, 'Error sending approval notification');
      }

      // Invalidate cache
      cache.delete('admin:dashboard:metrics');

      return reply.send({ 
        message: 'User approved successfully',
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          approval_status: 'approved',
        },
      });
    } catch (error: any) {
      fastify.log.error({ err: error }, 'Error approving user');
      reply.code(500).send({ error: 'Failed to approve user' });
    }
  });

  // Reject user registration
  fastify.patch('/users/:id/reject', {
    preHandler: [requireAdmin],
  }, async (request: any, reply) => {
    try {
      const { id } = request.params;
      const { reason } = request.body as { reason?: string };
      const adminId = getAdminId(request);

      // Get user info
      const userResult = await db.query(
        `SELECT id, full_name, email, role, approval_status FROM users WHERE id = $1`,
        [id]
      );

      if (userResult.rows.length === 0) {
        return reply.code(404).send({ error: 'User not found' });
      }

      const user = userResult.rows[0];

      if (user.approval_status === 'rejected') {
        return reply.code(400).send({ error: 'User is already rejected' });
      }

      // Update approval status
      await db.query(
        `UPDATE users SET approval_status = 'rejected', updated_at = NOW() WHERE id = $1`,
        [id]
      );

      // Log audit
      await logAudit({
        adminId,
        action: 'user_rejected',
        resourceType: 'user',
        resourceId: id,
        oldValue: { approval_status: user.approval_status },
        newValue: { approval_status: 'rejected', reason },
        ipAddress: getClientIp(request),
        userAgent: request.headers['user-agent'],
      });

      // Notify the user about rejection
      try {
        await createAlert({
          userId: id,
          severity: 'warning',
          title: 'Solicitação de Registro Rejeitada',
          message: reason
            ? `Sua solicitação de registro foi rejeitada. Motivo: ${reason}`
            : 'Sua solicitação de registro foi rejeitada. Entre em contato com o suporte para mais informações.',
          notificationType: 'account_activity',
          linkUrl: '/login',
          metadata: {
            adminId,
            action: 'rejected',
            reason,
            titleKey: 'websocket.accountRejected',
            messageKey: reason ? 'websocket.accountRejectedWithReason' : 'websocket.accountRejectedDesc',
            messageParams: reason ? { reason } : {},
          },
        });

        // Broadcast to the user via WebSocket
        const websocket = (fastify as any).websocket;
        if (websocket && websocket.broadcastToUser) {
          websocket.broadcastToUser(id, {
            type: 'account_rejected',
            message: 'Sua solicitação foi rejeitada',
            reason,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        fastify.log.error({ err: error }, 'Error sending rejection notification');
      }

      // Invalidate cache
      cache.delete('admin:dashboard:metrics');

      return reply.send({ 
        message: 'User rejected successfully',
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          approval_status: 'rejected',
        },
      });
    } catch (error: any) {
      fastify.log.error({ err: error }, 'Error rejecting user');
      reply.code(500).send({ error: 'Failed to reject user' });
    }
  });

  // Get all customers' wallets (admin-only, no customer approval required)
  fastify.get('/wallets', {
    preHandler: [requireAdmin],
  }, async (request: any, reply) => {
    try {
      const { page = '1', limit = '50', search } = request.query as { page?: string; limit?: string; search?: string };
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
      const offset = (pageNum - 1) * limitNum;

      let whereClause = "WHERE u.role = 'customer'";
      const params: any[] = [];
      let paramIndex = 1;
      if (search && search.trim()) {
        whereClause += ` AND (u.full_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
        params.push(`%${search.trim()}%`);
        paramIndex++;
      }

      const countResult = await db.query(
        `SELECT COUNT(*)::int as total FROM users u ${whereClause}`,
        params
      );
      const total = countResult.rows[0]?.total ?? 0;

      const usersResult = await db.query(
        `SELECT u.id, u.full_name, u.email, u.created_at
         FROM users u
         ${whereClause}
         ORDER BY u.full_name ASC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limitNum, offset]
      );

      const customers = usersResult.rows;
      const wallets: any[] = [];

      for (const u of customers) {
        let cash = 0;
        let investments = 0;
        let debt = 0;
        const accounts: any[] = [];
        const holdingsList: any[] = [];
        const cardsList: any[] = [];

        try {
          const cashResult = await db.query(
            `SELECT id, display_name, account_type, balance_cents, currency, last_refreshed_at
             FROM bank_accounts WHERE user_id = $1`,
            [u.id]
          );
          for (const row of cashResult.rows) {
            const bal = (row.balance_cents ?? 0) / 100;
            cash += bal;
            accounts.push({
              id: row.id,
              displayName: row.display_name,
              accountType: row.account_type,
              balanceCents: row.balance_cents,
              balance: bal,
              currency: row.currency,
              lastRefreshedAt: row.last_refreshed_at,
            });
          }
        } catch {}

        try {
          const invResult = await db.query(
            `SELECT id, asset_id, quantity, market_value_cents, currency
             FROM holdings WHERE user_id = $1`,
            [u.id]
          );
          for (const row of invResult.rows) {
            const val = (row.market_value_cents ?? 0) / 100;
            investments += val;
            holdingsList.push({
              id: row.id,
              marketValueCents: row.market_value_cents,
              marketValue: val,
              currency: row.currency,
              quantity: row.quantity,
            });
          }
        } catch {}

        try {
          const debtResult = await db.query(
            `SELECT cc.id, cc.display_name, cc.balance_cents, cc.currency,
                    (SELECT COALESCE(SUM(ci.total_cents), 0) FROM card_invoices ci
                     WHERE ci.card_id = cc.id AND ci.status = 'open') as open_invoice_cents
             FROM credit_cards cc WHERE cc.user_id = $1`,
            [u.id]
          );
          for (const row of debtResult.rows) {
            const openCents = parseInt(row.open_invoice_cents, 10) || 0;
            const cardDebt = openCents / 100;
            debt += cardDebt;
            cardsList.push({
              id: row.id,
              displayName: row.display_name,
              balanceCents: row.balance_cents,
              openInvoiceCents: openCents,
              debt: cardDebt,
              currency: row.currency,
            });
          }
        } catch {}

        const netWorth = cash + investments - debt;
        wallets.push({
          customerId: u.id,
          name: u.full_name,
          email: u.email,
          createdAt: u.created_at,
          summary: { cash, investments, debt, netWorth },
          accounts,
          holdings: holdingsList,
          cards: cardsList,
        });
      }

      return reply.send({
        wallets,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 0,
        },
      });
    } catch (error: any) {
      fastify.log.error(error, 'Failed to fetch customer wallets');
      reply.code(500).send({ error: 'Failed to fetch customer wallets', details: error.message });
    }
  });

  // Delete user
  fastify.delete('/users/:id', {
    preHandler: [requireAdmin],
  }, async (request: any, reply) => {
    try {
      const { id } = request.params;
      const adminId = getAdminId(request);

      // Prevent admin from deleting themselves
      if (id === adminId) {
        return reply.code(400).send({ error: 'You cannot delete your own account' });
      }

      // Get user info before deletion for audit log
      const userResult = await db.query(
        `SELECT id, full_name, email, role, approval_status, is_active FROM users WHERE id = $1`,
        [id]
      );

      if (userResult.rows.length === 0) {
        return reply.code(404).send({ error: 'User not found' });
      }

      const user = userResult.rows[0];

      // Prevent deletion of other admin users (optional safety check)
      if (user.role === 'admin') {
        return reply.code(403).send({ error: 'Cannot delete admin users' });
      }

      // Log audit before deletion
      await logAudit({
        adminId,
        action: 'user_deleted',
        resourceType: 'user',
        resourceId: id,
        oldValue: {
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          approval_status: user.approval_status,
          is_active: user.is_active,
        },
        newValue: null,
        ipAddress: getClientIp(request),
        userAgent: request.headers['user-agent'],
      });

      // Delete the user (CASCADE will handle related records)
      await db.query('DELETE FROM users WHERE id = $1', [id]);

      // Invalidate cache
      cache.delete('admin:dashboard:metrics');

      return reply.send({ 
        message: 'User deleted successfully',
        deletedUser: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
        },
      });
    } catch (error: any) {
      fastify.log.error({ err: error }, 'Error deleting user');
      reply.code(500).send({ error: 'Failed to delete user' });
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
      const query = request.query as { period?: string; year?: string; dateFrom?: string; dateTo?: string };
      const period = query.period || 'month';
      const year = parseInt(query.year || String(new Date().getFullYear()), 10) || new Date().getFullYear();
      const dateFrom = query.dateFrom; // ISO date string
      const dateTo = query.dateTo;

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

      // Revenue by period (with subscription count per period) - chronological order for charts
      let revenueResult: any;
      if (hasPayments) {
        try {
          if (period === 'year') {
            revenueResult = await db.query(
              `SELECT 
                 TO_CHAR(created_at, 'Mon') as month,
                 EXTRACT(MONTH FROM created_at) as month_num,
                 COALESCE(SUM(amount_cents), 0) / 100.0 as revenue,
                 COUNT(*)::int as subscriptions
               FROM payments
               WHERE status = 'paid'
               AND EXTRACT(YEAR FROM created_at) = $1
               GROUP BY month, month_num
               ORDER BY month_num ASC`,
              [year]
            );
          } else if (period === 'quarter') {
            revenueResult = await db.query(
              `SELECT 
                 'Q' || EXTRACT(QUARTER FROM created_at) as month,
                 EXTRACT(QUARTER FROM created_at)::int as month_num,
                 COALESCE(SUM(amount_cents), 0) / 100.0 as revenue,
                 COUNT(*)::int as subscriptions
               FROM payments
               WHERE status = 'paid'
               AND created_at >= DATE_TRUNC('quarter', NOW() - INTERVAL '4 quarters')
               GROUP BY month, month_num
               ORDER BY month_num ASC`
            );
          } else {
            revenueResult = await db.query(
              `SELECT 
                 TO_CHAR(created_at, 'Mon') as month,
                 EXTRACT(MONTH FROM created_at) as month_num,
                 COALESCE(SUM(amount_cents), 0) / 100.0 as revenue,
                 COUNT(*)::int as subscriptions
               FROM payments
               WHERE status = 'paid'
               AND created_at >= NOW() - INTERVAL '6 months'
               GROUP BY month, month_num
               ORDER BY month_num ASC`
            );
          }
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

      // Recent transactions - optional dateFrom/dateTo filter
      let transactionsResult: any;
      if (hasPayments && hasSubscriptions) {
        try {
          let txQuery = `SELECT 
               p.id,
               TO_CHAR(p.created_at, 'DD/MM/YYYY') as date,
               p.created_at as sort_at,
               CASE 
                 WHEN p.amount_cents > 0 THEN 'Assinatura'
                 ELSE 'Comissão'
               END as type,
               p.amount_cents / 100.0 as amount,
               u.full_name as client_name
             FROM payments p
             LEFT JOIN subscriptions s ON p.subscription_id = s.id
             LEFT JOIN users u ON s.user_id = u.id
             WHERE p.status = 'paid'`;
          const txParams: any[] = [];
          if (dateFrom) {
            txParams.push(dateFrom);
            txQuery += ` AND p.created_at >= $${txParams.length}::date`;
          }
          if (dateTo) {
            txParams.push(dateTo);
            txQuery += ` AND p.created_at <= $${txParams.length}::date + INTERVAL '1 day'`;
          }
          if (txParams.length === 0) {
            txQuery += ` AND p.created_at >= NOW() - INTERVAL '30 days'`;
          }
          txQuery += ` ORDER BY p.created_at DESC LIMIT 100`;
          transactionsResult = await db.query(txQuery, txParams);
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
          subscriptions: parseInt(row.subscriptions, 10) || 0,
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
      let hasPluggyAccounts = false;
      let hasPluggyInvestments = false;
      let hasPluggyTransactions = false;

      try { await db.query('SELECT 1 FROM subscriptions LIMIT 1'); hasSubscriptions = true; } catch {}
      try { await db.query('SELECT 1 FROM bank_accounts LIMIT 1'); hasBankAccounts = true; } catch {}
      try { await db.query('SELECT 1 FROM holdings LIMIT 1'); hasHoldings = true; } catch {}
      try { await db.query('SELECT 1 FROM connections LIMIT 1'); hasConnections = true; } catch {}
      try { await db.query('SELECT 1 FROM goals LIMIT 1'); hasGoals = true; } catch {}
      try { await db.query('SELECT 1 FROM pluggy_accounts LIMIT 1'); hasPluggyAccounts = true; } catch {}
      try { await db.query('SELECT 1 FROM pluggy_investments LIMIT 1'); hasPluggyInvestments = true; } catch {}
      try { await db.query('SELECT 1 FROM pluggy_transactions LIMIT 1'); hasPluggyTransactions = true; } catch {}

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

      // Calculate net worth — prefer pluggy tables (values in decimal), fall back to legacy tables (values in cents)
      const netWorthParts: string[] = [];
      if (hasPluggyAccounts) {
        netWorthParts.push('COALESCE((SELECT SUM(current_balance) FROM pluggy_accounts WHERE user_id = u.id), 0)');
      } else if (hasBankAccounts) {
        netWorthParts.push('COALESCE((SELECT SUM(balance_cents) FROM bank_accounts WHERE user_id = u.id), 0) / 100.0');
      }
      if (hasPluggyInvestments) {
        netWorthParts.push('COALESCE((SELECT SUM(current_value) FROM pluggy_investments WHERE user_id = u.id), 0)');
      } else if (hasHoldings) {
        netWorthParts.push('COALESCE((SELECT SUM(market_value_cents) FROM holdings WHERE user_id = u.id), 0) / 100.0');
      }
      const netWorthQuery = netWorthParts.length > 0 ? netWorthParts.join(' + ') : '0';

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

      // Build engagement score as a sum of activity signals, capped at 100
      // Connected bank account = 30, Has transactions = 30, Set goals = 20, Updated profile = 20
      const engagementParts: string[] = [];
      if (hasConnections) {
        engagementParts.push('CASE WHEN EXISTS(SELECT 1 FROM connections WHERE user_id = u.id AND status = \'connected\') THEN 30 ELSE 0 END');
      }
      if (hasPluggyTransactions) {
        engagementParts.push('CASE WHEN EXISTS(SELECT 1 FROM pluggy_transactions WHERE user_id = u.id) THEN 30 ELSE 0 END');
      }
      if (hasGoals) {
        engagementParts.push('CASE WHEN EXISTS(SELECT 1 FROM goals WHERE user_id = u.id) THEN 20 ELSE 0 END');
      }
      engagementParts.push('CASE WHEN u.updated_at > u.created_at THEN 20 ELSE 0 END');
      const engagementQuery = `LEAST(${engagementParts.join(' + ')}, 100)`;

      // Build query based on which tables exist
      let dataQuery: string;
      if (hasSubscriptions) {
        // Use JOIN if subscriptions exists
        dataQuery = `
          SELECT
            u.id,
            u.full_name as name,
            u.email,
            (${netWorthQuery}) as net_worth,
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
            (${netWorthQuery}) as net_worth,
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

      // Read registration approval setting from system_settings
      let registrationRequiresApproval = true;
      try {
        const settingsResult = await db.query(
          `SELECT value FROM system_settings WHERE key = 'registration_requires_approval' LIMIT 1`
        );
        if (settingsResult.rows.length > 0 && settingsResult.rows[0].value === 'false') {
          registrationRequiresApproval = false;
        }
      } catch {
        // Table may not exist
      }

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
          registrationRequiresApproval,
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

  // Update registration approval setting (require admin approval vs auto-approve new users)
  fastify.put('/settings/registration-approval', {
    preHandler: [requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { registrationRequiresApproval } = request.body as { registrationRequiresApproval: boolean };
      if (typeof registrationRequiresApproval !== 'boolean') {
        return reply.code(400).send({ error: 'registrationRequiresApproval must be a boolean' });
      }
      await db.query(
        `INSERT INTO system_settings (key, value) VALUES ('registration_requires_approval', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [registrationRequiresApproval ? 'true' : 'false']
      );
      return reply.send({ message: 'Registration approval setting updated successfully' });
    } catch (error: any) {
      fastify.log.error('Error updating registration approval setting:', error);
      return reply.code(500).send({ error: 'Failed to update setting', details: error.message });
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

  // Get subscription history (all subscriptions for admin)
  fastify.get('/subscriptions/history', {
    preHandler: [requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { page = '1', limit = '50', userId, status } = request.query as any;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Check if subscriptions and plans tables exist
      let hasSubscriptions = false;
      try {
        await db.query('SELECT 1 FROM subscriptions LIMIT 1');
        await db.query('SELECT 1 FROM plans LIMIT 1');
        hasSubscriptions = true;
      } catch {}

      if (!hasSubscriptions) {
        return reply.send({
          history: [],
          pagination: { page: 1, limit: parseInt(limit), total: 0, totalPages: 0 },
        });
      }

      let query = `
        SELECT 
          s.id,
          s.status,
          s.started_at,
          s.current_period_start,
          s.current_period_end,
          s.canceled_at,
          s.created_at,
          u.id as user_id,
          u.full_name as user_name,
          u.email as user_email,
          p.id as plan_id,
          p.name as plan_name,
          p.code as plan_code,
          p.price_cents as plan_price_cents
        FROM subscriptions s
        JOIN plans p ON s.plan_id = p.id
        JOIN users u ON s.user_id = u.id
        WHERE 1=1
      `;

      const params: any[] = [];
      let paramIndex = 1;

      if (userId) {
        query += ` AND s.user_id = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
      }

      if (status) {
        query += ` AND s.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      // Get total count
      const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
      const countResult = await db.query(countQuery, params);
      const total = parseInt(countResult.rows[0]?.total || '0', 10);

      // Add ordering and pagination
      query += ` ORDER BY s.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(parseInt(limit), offset);

      const result = await db.query(query, params);

      return reply.send({
        history: result.rows.map((row: any) => ({
          id: row.id,
          status: row.status,
          planName: row.plan_name,
          planCode: row.plan_code,
          priceCents: row.plan_price_cents,
          startedAt: row.started_at,
          currentPeriodStart: row.current_period_start,
          currentPeriodEnd: row.current_period_end,
          canceledAt: row.canceled_at,
          createdAt: row.created_at,
          user: {
            id: row.user_id,
            name: row.user_name,
            email: row.user_email,
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
      fastify.log.error('Error fetching subscription history:', error);
      reply.code(500).send({ error: 'Failed to fetch subscription history', details: error.message });
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

  // Get all comments (for management)
  fastify.get('/comments', {
    preHandler: [requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { page = '1', limit = '10' } = request.query as any;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Check if comments table exists
      try {
        await db.query('SELECT 1 FROM comments LIMIT 1');
      } catch {
        return reply.send({ comments: [], pagination: { total: 0, totalPages: 0, page: parseInt(page), limit: parseInt(limit) } });
      }

      // Get total count
      const countResult = await db.query('SELECT COUNT(*) as total FROM comments');
      const total = parseInt(countResult.rows[0].total);

      // Get all comments with user info
      const result = await db.query(
        `SELECT
          c.id,
          c.content,
          c.reply,
          c.replied_at,
          c.created_at,
          u.full_name as user_name,
          u.email as user_email
         FROM comments c
         JOIN users u ON c.user_id = u.id
         ORDER BY c.created_at DESC
         LIMIT $1 OFFSET $2`,
        [parseInt(limit), offset]
      );

      return reply.send({
        comments: result.rows.map((row: any) => ({
          ...row,
          title: null,
          status: row.reply ? 'replied' : 'pending',
          processed_at: row.replied_at || null,
        })),
        pagination: {
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
          page: parseInt(page),
          limit: parseInt(limit)
        }
      });
    } catch (error: any) {
      fastify.log.error('Error fetching admin comments:', error);
      reply.code(500).send({ error: 'Failed to fetch comments', details: error.message });
    }
  });

  // Reply to a comment
  fastify.post('/comments/:id/reply', {
    preHandler: [requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const adminId = getAdminId(request);
      const { id } = request.params as { id: string };
      const { reply: replyContent } = request.body as { reply: string };

      if (!replyContent) {
        return reply.code(400).send({ error: 'Reply content is required' });
      }

      const result = await db.query(
        `UPDATE comments 
         SET reply = $1, status = 'replied', processed_at = NOW(), processed_by = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [replyContent, adminId, id]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Comment not found' });
      }

      const comment = result.rows[0];
      const commentUserId = comment.user_id;

      // Get admin and user info for notification
      const [adminResult, userResult] = await Promise.all([
        db.query('SELECT full_name FROM users WHERE id = $1', [adminId]),
        db.query('SELECT full_name, email, role FROM users WHERE id = $1', [commentUserId]),
      ]);
      const adminName = adminResult.rows[0]?.full_name || 'Administrador';
      const userName = userResult.rows[0]?.full_name || 'Usuário';
      const userRole = userResult.rows[0]?.role || 'customer';

      // Determine the correct settings path based on user role
      let settingsPath = '/app/settings?tab=comments';
      if (userRole === 'consultant') {
        settingsPath = '/consultant/settings?tab=comments';
      } else if (userRole === 'admin') {
        settingsPath = '/admin/settings?tab=comments';
      }

      // Notify the comment author about the reply
      try {
        await createAlert({
          userId: commentUserId,
          severity: 'info',
          title: 'Resposta ao seu Comentário',
          message: `Administrador respondeu ao seu comentário: ${comment.title || 'Sem título'}`,
          notificationType: 'message_received',
          linkUrl: settingsPath,
          metadata: {
            commentId: id,
            adminId,
            adminName,
            titleKey: 'websocket.commentReplied',
            messageKey: 'websocket.commentRepliedDesc',
            messageParams: {},
          },
        });

        // Broadcast to the comment author via WebSocket
        const websocket = (fastify as any).websocket;
        if (websocket && websocket.broadcastToUser) {
          websocket.broadcastToUser(commentUserId, {
            type: 'comment_replied',
            message: 'Seu comentário foi respondido',
            commentId: id,
            title: comment.title || 'Sem título',
            reply: replyContent.substring(0, 100), // First 100 chars
            adminName,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        // Don't fail the request if notification fails
        fastify.log.error({ err: error }, 'Error sending notification for comment reply');
      }

      return reply.send({
        comment: result.rows[0],
        message: 'Reply sent successfully'
      });
    } catch (error: any) {
      fastify.log.error('Error replying to comment:', error);
      reply.code(500).send({ error: 'Failed to reply to comment', details: error.message });
    }
  });

  // Delete a comment (Admin)
  fastify.delete('/comments/:id', {
    preHandler: [requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };

      const result = await db.query(
        'DELETE FROM comments WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Comment not found' });
      }

      return reply.send({ message: 'Comment deleted successfully' });
    } catch (error: any) {
      fastify.log.error('Error deleting comment:', error);
      reply.code(500).send({ error: 'Failed to delete comment', details: error.message });
    }
  });

  // Delete a subscription record
  fastify.delete('/subscriptions/:id', {
    preHandler: [requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as any;

      // Check if subscriptions table exists
      let hasSubscriptions = false;
      try {
        await db.query('SELECT 1 FROM subscriptions LIMIT 1');
        hasSubscriptions = true;
      } catch {}

      if (!hasSubscriptions) {
        return reply.code(404).send({ error: 'Subscription not found' });
      }

      // Verify subscription exists
      const verifyResult = await db.query(
        'SELECT id, user_id FROM subscriptions WHERE id = $1',
        [id]
      );

      if (verifyResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Subscription not found' });
      }

      // Delete the subscription
      await db.query('DELETE FROM subscriptions WHERE id = $1', [id]);

      // Log the action
      await logAudit({
        adminId: getAdminId(request),
        action: 'subscription_deleted',
        resourceType: 'subscription',
        resourceId: id,
        ipAddress: getClientIp(request),
        userAgent: request.headers['user-agent'],
      });

      return reply.send({ success: true, message: 'Subscription deleted successfully' });
    } catch (error: any) {
      fastify.log.error('Error deleting subscription:', error);
      reply.code(500).send({ error: 'Failed to delete subscription', details: error.message });
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

  // =========================
  // INSTITUTIONS MANAGEMENT
  // =========================

  // Get all institutions (for admin management)
  fastify.get('/institutions', {
    preHandler: [requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { provider } = request.query as any;
      
      let query = `
        SELECT 
          id, provider, external_id, name, logo_url, 
          COALESCE(enabled, true) as enabled,
          created_at, updated_at
        FROM institutions
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (provider) {
        query += ` AND provider = $${paramIndex++}`;
        params.push(provider);
      }

      query += ' ORDER BY name ASC';

      const result = await db.query(query, params);
      
      return reply.send({ institutions: result.rows });
    } catch (error: any) {
      fastify.log.error('Error fetching institutions:', error);
      reply.code(500).send({ error: 'Failed to fetch institutions', details: error.message });
    }
  });

  // Update institution (enable/disable)
  fastify.patch('/institutions/:id', {
    preHandler: [requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as any;
      const { enabled, name, logo_url } = request.body as any;

      // Check if institution exists
      const checkResult = await db.query('SELECT id FROM institutions WHERE id = $1', [id]);
      if (checkResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Institution not found' });
      }

      // Build update query dynamically
      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (enabled !== undefined) {
        updates.push(`enabled = $${paramIndex++}`);
        params.push(enabled);
      }
      if (name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        params.push(name);
      }
      if (logo_url !== undefined) {
        updates.push(`logo_url = $${paramIndex++}`);
        params.push(logo_url);
      }

      if (updates.length === 0) {
        return reply.code(400).send({ error: 'No fields to update' });
      }

      updates.push(`updated_at = NOW()`);
      params.push(id);

      const query = `
        UPDATE institutions 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, provider, external_id, name, logo_url, COALESCE(enabled, true) as enabled, created_at, updated_at
      `;

      const result = await db.query(query, params);

      // Log the action
      await logAudit({
        adminId: getAdminId(request),
        action: 'institution_updated',
        resourceType: 'institution',
        resourceId: id,
        ipAddress: getClientIp(request),
        userAgent: request.headers['user-agent'],
      });

      return reply.send({ institution: result.rows[0] });
    } catch (error: any) {
      fastify.log.error('Error updating institution:', error);
      reply.code(500).send({ error: 'Failed to update institution', details: error.message });
    }
  });

  // Bulk update institutions (enable/disable multiple)
  fastify.patch('/institutions', {
    preHandler: [requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { institutions } = request.body as any;

      if (!Array.isArray(institutions)) {
        return reply.code(400).send({ error: 'institutions must be an array' });
      }

      const results = [];
      for (const inst of institutions) {
        if (!inst.id || inst.enabled === undefined) {
          continue;
        }

        try {
          const result = await db.query(
            `UPDATE institutions 
             SET enabled = $1, updated_at = NOW()
             WHERE id = $2
             RETURNING id, name, COALESCE(enabled, true) as enabled`,
            [inst.enabled, inst.id]
          );
          if (result.rows.length > 0) {
            results.push(result.rows[0]);
          }
        } catch (err: any) {
          fastify.log.warn(`Error updating institution ${inst.id}:`, err);
        }
      }

      // Log the action
      await logAudit({
        adminId: getAdminId(request),
        action: 'institutions_bulk_updated',
        resourceType: 'institution',
        resourceId: undefined, // Bulk operations don't have a single resource ID
        metadata: { 
          updatedCount: results.length,
          institutionIds: results.map(r => r.id)
        },
        ipAddress: getClientIp(request),
        userAgent: request.headers['user-agent'],
      });

      return reply.send({ institutions: results, updated: results.length });
    } catch (error: any) {
      fastify.log.error('Error bulk updating institutions:', error);
      reply.code(500).send({ error: 'Failed to bulk update institutions', details: error.message });
    }
  });

  // Create new institution
  fastify.post('/institutions', {
    preHandler: [requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { provider, name, logo_url, external_id, enabled } = request.body as any;

      // Validate required fields
      if (!provider || !name) {
        return reply.code(400).send({ error: 'provider and name are required' });
      }

      // Validate provider enum
      if (!['open_finance', 'b3'].includes(provider)) {
        return reply.code(400).send({ error: 'provider must be "open_finance" or "b3"' });
      }

      // Check for duplicate (provider + external_id) if external_id is provided
      if (external_id) {
        const duplicateCheck = await db.query(
          'SELECT id FROM institutions WHERE provider = $1 AND external_id = $2',
          [provider, external_id]
        );
        if (duplicateCheck.rows.length > 0) {
          return reply.code(409).send({ error: 'Institution with this provider and external_id already exists' });
        }
      }

      // Insert new institution
      const result = await db.query(
        `INSERT INTO institutions (provider, name, logo_url, external_id, enabled)
         VALUES ($1, $2, $3, $4, COALESCE($5, true))
         RETURNING id, provider, external_id, name, logo_url, COALESCE(enabled, true) as enabled, created_at, updated_at`,
        [provider, name, logo_url || null, external_id || null, enabled !== undefined ? enabled : true]
      );

      const institution = result.rows[0];

      // Log the action
      await logAudit({
        adminId: getAdminId(request),
        action: 'institution_created',
        resourceType: 'institution',
        resourceId: institution.id,
        details: { name: institution.name, provider: institution.provider },
        ipAddress: getClientIp(request),
        userAgent: request.headers['user-agent'],
      });

      return reply.code(201).send({ institution });
    } catch (error: any) {
      fastify.log.error('Error creating institution:', error);
      reply.code(500).send({ error: 'Failed to create institution', details: error.message });
    }
  });
}

