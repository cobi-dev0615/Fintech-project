import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';
import { createPreference } from '../services/mercadopago.js';

// Check if using test credentials
const isTestMode = process.env.MERCADOPAGO_ACCESS_TOKEN?.startsWith('TEST-') || 
                   process.env.MERCADOPAGO_PUBLIC_KEY?.startsWith('TEST-');

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

  // Get user's subscription history
  fastify.get('/history', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { page = '1', limit = '10' } = request.query as any;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Check if subscriptions and plans tables exist
      let hasSubscriptions = false;
      try {
        await db.query('SELECT 1 FROM subscriptions LIMIT 1');
        hasSubscriptions = true;
      } catch {}

      if (!hasSubscriptions) {
        return reply.send({ history: [], pagination: { total: 0, totalPages: 0, page: parseInt(page), limit: parseInt(limit) } });
      }

      // Get total count
      const countResult = await db.query(
        'SELECT COUNT(*) as total FROM subscriptions WHERE user_id = $1',
        [userId]
      );
      const total = parseInt(countResult.rows[0].total);

      // Get subscription history
      const result = await db.query(
        `SELECT 
          s.id,
          s.status,
          s.started_at,
          s.current_period_start,
          s.current_period_end,
          s.canceled_at,
          s.created_at,
          p.name as plan_name,
          p.price_cents as plan_price_cents
        FROM subscriptions s
        JOIN plans p ON s.plan_id = p.id
        WHERE s.user_id = $1
        ORDER BY s.created_at DESC
        LIMIT $2 OFFSET $3`,
        [userId, parseInt(limit), offset]
      );

      return reply.send({
        history: result.rows.map(row => ({
          id: row.id,
          status: row.status,
          planName: row.plan_name,
          priceCents: row.plan_price_cents,
          startedAt: row.started_at,
          currentPeriodStart: row.current_period_start,
          currentPeriodEnd: row.current_period_end,
          canceledAt: row.canceled_at,
          createdAt: row.created_at
        })),
        pagination: {
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
          page: parseInt(page),
          limit: parseInt(limit)
        }
      });
    } catch (error: any) {
      fastify.log.error('Error fetching subscription history:', error);
      reply.code(500).send({ error: 'Failed to fetch subscription history', details: error.message });
    }
  });

  // Create a new subscription
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { planId, billingPeriod = 'monthly', payment } = request.body as { 
        planId: string;
        billingPeriod?: 'monthly' | 'annual';
        payment?: {
          paymentMethod: string;
          cardNumber: string;
          cardName: string;
          expiryDate: string;
          cvv: string;
          billing: {
            name: string;
            email: string;
            phone: string;
            document: string;
            zipCode: string;
            address: string;
            city: string;
            state: string;
          };
        };
      };

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
      // Check if plans table has monthly_price_cents and annual_price_cents columns
      let hasBillingColumns = false;
      try {
        await db.query('SELECT monthly_price_cents, annual_price_cents FROM plans LIMIT 1');
        hasBillingColumns = true;
      } catch {}

      let planQuery = 'SELECT id, code, name, price_cents, is_active';
      if (hasBillingColumns) {
        planQuery += ', monthly_price_cents, annual_price_cents';
      }
      planQuery += ' FROM plans WHERE id = $1';
      
      const planResult = await db.query(planQuery, [planId]);

      if (planResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Plan not found' });
      }

      const plan = planResult.rows[0];
      if (!plan.is_active) {
        return reply.code(400).send({ error: 'Plan is not active' });
      }

      // Check if user already has an active or pending subscription
      // Include 'past_due' to prevent duplicate pending subscriptions
      const existingSub = await db.query(
        `SELECT id, status FROM subscriptions 
         WHERE user_id = $1 AND status IN ('active', 'trialing', 'past_due')
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId]
      );

      if (existingSub.rows.length > 0) {
        const existingStatus = existingSub.rows[0].status;
        // Only cancel if it's active or trialing
        // For 'past_due' subscriptions, we'll update it instead of canceling
        if (existingStatus === 'active' || existingStatus === 'trialing') {
          await db.query(
            `UPDATE subscriptions 
             SET status = 'canceled', canceled_at = now(), updated_at = now()
             WHERE id = $1`,
            [existingSub.rows[0].id]
          );
        } else if (existingStatus === 'past_due') {
          // If there's a pending subscription, cancel it first
          // This prevents duplicate pending subscriptions
          await db.query(
            `UPDATE subscriptions 
             SET status = 'canceled', canceled_at = now(), updated_at = now()
             WHERE id = $1`,
            [existingSub.rows[0].id]
          );
        }
      }

      // Calculate period dates based on billing period
      const now = new Date();
      const periodStart = now;
      const periodEnd = new Date(now);
      if (billingPeriod === 'annual') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1); // 1 year subscription
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1); // 1 month subscription
      }
      
      // Get the correct price based on billing period
      let planPrice = plan.price_cents;
      if (hasBillingColumns) {
        if (billingPeriod === 'annual' && plan.annual_price_cents !== null) {
          planPrice = plan.annual_price_cents;
        } else if (billingPeriod === 'monthly' && plan.monthly_price_cents !== null) {
          planPrice = plan.monthly_price_cents;
        }
      }

      // Determine initial subscription status
      // For paid plans: use 'past_due' (pending payment) - will be activated when payment is confirmed
      // For free plans: use 'active' immediately
      const initialStatus = planPrice > 0 ? 'past_due' : 'active';

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
        [userId, planId, initialStatus, periodStart, periodStart, periodEnd]
      );

      const subscription = result.rows[0];

      // Create Mercado Pago preference for payment
      let preferenceId: string | null = null;
      let checkoutUrl: string | null = null;
      
      if (planPrice > 0) {
        try {
          // Get user info for payer
          const userResult = await db.query(
            'SELECT full_name, email FROM users WHERE id = $1',
            [userId]
          );
          const user = userResult.rows[0];

          // Create Mercado Pago preference
          const preference = await createPreference({
            items: [{
              title: `Plano ${plan.name} - ${billingPeriod === 'monthly' ? 'Mensal' : 'Anual'}`,
              description: `Assinatura do plano ${plan.name}`,
              quantity: 1,
              unit_price: planPrice / 100, // Convert cents to BRL
            }],
            payer: payment?.billing ? {
              name: payment.billing.name,
              email: payment.billing.email,
              phone: {
                area_code: payment.billing.phone.substring(0, 2) || '11',
                number: payment.billing.phone.substring(2) || '',
              },
              identification: {
                type: 'CPF',
                number: payment.billing.document.replace(/\D/g, ''),
              },
              address: {
                zip_code: payment.billing.zipCode.replace(/\D/g, ''),
                street_name: payment.billing.address,
                city: payment.billing.city,
                state: payment.billing.state,
              },
            } : {
              name: user?.full_name || 'Usuário',
              email: user?.email || '',
            },
            external_reference: subscription.id,
            metadata: {
              subscriptionId: subscription.id,
              userId,
              planId,
              billingPeriod,
            },
          });

          preferenceId = preference.id;
          // Use sandbox_init_point for test mode, init_point for production
          checkoutUrl = isTestMode 
            ? (preference.sandbox_init_point || preference.init_point)
            : (preference.init_point || preference.sandbox_init_point);

          // Update subscription with preference ID
          await db.query(
            'UPDATE subscriptions SET metadata_json = $1 WHERE id = $2',
            [JSON.stringify({ mercadopago_preference_id: preferenceId }), subscription.id]
          );
        } catch (error: any) {
          fastify.log.error('Error creating Mercado Pago preference:', error);
          // Don't fail the subscription creation, but log the error
          // The subscription will be created but payment will need to be handled separately
        }
      }

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
            priceCents: planPrice,
          },
        },
        payment: preferenceId ? {
          preferenceId,
          checkoutUrl,
        } : undefined,
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
