import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';

export async function subscriptionsRoutes(fastify: FastifyInstance) {
  // Get user's current subscription
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;

      // Check if subscriptions and plans tables exist
      let hasSubscriptions = false;
      try {
        await db.query('SELECT 1 FROM subscriptions LIMIT 1');
        await db.query('SELECT 1 FROM plans LIMIT 1');
        hasSubscriptions = true;
      } catch {}

      if (!hasSubscriptions) {
        return reply.send({ subscription: null });
      }

      // Get user's active subscription
      const result = await db.query(
        `SELECT 
          s.id,
          s.status,
          s.started_at,
          s.current_period_start,
          s.current_period_end,
          s.canceled_at,
          p.id as plan_id,
          p.code as plan_code,
          p.name as plan_name,
          p.price_cents as plan_price_cents
        FROM subscriptions s
        JOIN plans p ON s.plan_id = p.id
        WHERE s.user_id = $1
        ORDER BY s.created_at DESC
        LIMIT 1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return reply.send({ subscription: null });
      }

      const sub = result.rows[0];
      return reply.send({
        subscription: {
          id: sub.id,
          status: sub.status,
          startedAt: sub.started_at,
          currentPeriodStart: sub.current_period_start,
          currentPeriodEnd: sub.current_period_end,
          canceledAt: sub.canceled_at,
          plan: {
            id: sub.plan_id,
            code: sub.plan_code,
            name: sub.plan_name,
            priceCents: sub.plan_price_cents,
          },
        },
      });
    } catch (error: any) {
      fastify.log.error('Error fetching subscription:', error);
      reply.code(500).send({ error: 'Failed to fetch subscription', details: error.message });
    }
  });

  // Create a new subscription
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { planId } = request.body as { planId: string };

      if (!planId) {
        return reply.code(400).send({ error: 'planId is required' });
      }

      // Check if subscriptions and plans tables exist
      let hasSubscriptions = false;
      try {
        await db.query('SELECT 1 FROM subscriptions LIMIT 1');
        await db.query('SELECT 1 FROM plans LIMIT 1');
        hasSubscriptions = true;
      } catch {}

      if (!hasSubscriptions) {
        return reply.code(500).send({ error: 'Subscriptions or plans table not found' });
      }

      // Verify plan exists and is active
      const planResult = await db.query(
        'SELECT id, code, name, price_cents, is_active FROM plans WHERE id = $1',
        [planId]
      );

      if (planResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Plan not found' });
      }

      const plan = planResult.rows[0];
      if (!plan.is_active) {
        return reply.code(400).send({ error: 'Plan is not active' });
      }

      // Check if user already has an active subscription
      const existingSub = await db.query(
        `SELECT id, status FROM subscriptions 
         WHERE user_id = $1 AND status IN ('active', 'trialing')
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId]
      );

      if (existingSub.rows.length > 0) {
        // Cancel existing subscription
        await db.query(
          `UPDATE subscriptions 
           SET status = 'canceled', canceled_at = now(), updated_at = now()
           WHERE id = $1`,
          [existingSub.rows[0].id]
        );
      }

      // Calculate period dates
      const now = new Date();
      const periodStart = now;
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1); // 1 month subscription

      // Create new subscription
      const result = await db.query(
        `INSERT INTO subscriptions (
          user_id, 
          plan_id, 
          status, 
          started_at, 
          current_period_start, 
          current_period_end
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, status, started_at, current_period_start, current_period_end`,
        [userId, planId, 'active', periodStart, periodStart, periodEnd]
      );

      const subscription = result.rows[0];

      return reply.code(201).send({
        subscription: {
          id: subscription.id,
          status: subscription.status,
          startedAt: subscription.started_at,
          currentPeriodStart: subscription.current_period_start,
          currentPeriodEnd: subscription.current_period_end,
          plan: {
            id: plan.id,
            code: plan.code,
            name: plan.name,
            priceCents: plan.price_cents,
          },
        },
      });
    } catch (error: any) {
      fastify.log.error('Error creating subscription:', error);
      reply.code(500).send({ error: 'Failed to create subscription', details: error.message });
    }
  });

  // Cancel subscription
  fastify.patch('/cancel', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;

      // Check if subscriptions table exists
      let hasSubscriptions = false;
      try {
        await db.query('SELECT 1 FROM subscriptions LIMIT 1');
        hasSubscriptions = true;
      } catch {}

      if (!hasSubscriptions) {
        return reply.code(500).send({ error: 'Subscriptions table not found' });
      }

      // Get user's active subscription
      const subResult = await db.query(
        `SELECT id FROM subscriptions 
         WHERE user_id = $1 AND status = 'active'
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId]
      );

      if (subResult.rows.length === 0) {
        return reply.code(404).send({ error: 'No active subscription found' });
      }

      // Cancel subscription
      await db.query(
        `UPDATE subscriptions 
         SET status = 'canceled', canceled_at = now(), updated_at = now()
         WHERE id = $1`,
        [subResult.rows[0].id]
      );

      return reply.send({ message: 'Subscription canceled successfully' });
    } catch (error: any) {
      fastify.log.error('Error canceling subscription:', error);
      reply.code(500).send({ error: 'Failed to cancel subscription', details: error.message });
    }
  });
}
