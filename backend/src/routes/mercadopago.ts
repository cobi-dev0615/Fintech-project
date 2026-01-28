import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';
import { getPayment, getPreference } from '../services/mercadopago.js';
import crypto from 'crypto';

export async function mercadopagoRoutes(fastify: FastifyInstance) {
  // Webhook handler for Mercado Pago notifications
  fastify.post('/webhook', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = request.body as any;
      const xSignature = request.headers['x-signature'] as string;
      const xRequestId = request.headers['x-request-id'] as string;

      // Verify webhook signature (optional but recommended)
      const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
      if (webhookSecret && xSignature) {
        const hash = crypto
          .createHmac('sha256', webhookSecret)
          .update(JSON.stringify(data))
          .digest('hex');
        
        if (hash !== xSignature) {
          fastify.log.warn('Invalid webhook signature');
          return reply.code(401).send({ error: 'Invalid signature' });
        }
      }

      // Handle different notification types
      if (data.type === 'payment') {
        const paymentId = data.data?.id;
        if (!paymentId) {
          return reply.code(400).send({ error: 'Payment ID missing' });
        }

        // Get payment details from Mercado Pago
        const payment = await getPayment(paymentId);
        
        // Extract external reference (subscription ID)
        const subscriptionId = payment.external_reference;
        if (!subscriptionId) {
          fastify.log.warn('Payment without external_reference:', paymentId);
          return reply.code(200).send({ received: true });
        }

        // Update payment status in database
        const paymentStatus = payment.status === 'approved' ? 'paid' : 
                              payment.status === 'pending' ? 'pending' :
                              payment.status === 'rejected' || payment.status === 'cancelled' ? 'failed' : 'pending';

        // Check if payment record exists
        const existingPayment = await db.query(
          'SELECT id FROM payments WHERE provider_payment_id = $1',
          [paymentId]
        );

        if (existingPayment.rows.length > 0) {
          // Update existing payment
          await db.query(
            `UPDATE payments 
             SET status = $1, 
                 paid_at = $2,
                 provider_payload = $3,
                 updated_at = now()
             WHERE provider_payment_id = $4`,
            [
              paymentStatus,
              paymentStatus === 'paid' ? new Date() : null,
              JSON.stringify(payment),
              paymentId,
            ]
          );
        } else {
          // Create new payment record
          const subscriptionResult = await db.query(
            'SELECT user_id, plan_id FROM subscriptions WHERE id = $1',
            [subscriptionId]
          );

          if (subscriptionResult.rows.length > 0) {
            const { user_id, plan_id } = subscriptionResult.rows[0];
            const planResult = await db.query(
              'SELECT price_cents FROM plans WHERE id = $1',
              [plan_id]
            );
            const amountCents = planResult.rows[0]?.price_cents || 0;

            await db.query(
              `INSERT INTO payments (
                subscription_id,
                user_id,
                amount_cents,
                currency,
                status,
                provider,
                provider_payment_id,
                provider_payload,
                paid_at
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
              [
                subscriptionId,
                user_id,
                amountCents,
                'BRL',
                paymentStatus,
                'mercadopago',
                paymentId,
                JSON.stringify(payment),
                paymentStatus === 'paid' ? new Date() : null,
              ]
            );
          }
        }

        // Update subscription status based on payment
        // Only activate subscription if payment is confirmed as 'paid'
        if (paymentStatus === 'paid') {
          // Check current subscription status to avoid unnecessary updates
          const subCheck = await db.query(
            'SELECT status FROM subscriptions WHERE id = $1',
            [subscriptionId]
          );
          
          if (subCheck.rows.length > 0 && subCheck.rows[0].status !== 'active') {
            // Only update if not already active
            await db.query(
              `UPDATE subscriptions 
               SET status = 'active', 
                   started_at = COALESCE(started_at, now()),
                   updated_at = now()
               WHERE id = $1`,
              [subscriptionId]
            );
            fastify.log.info(`Subscription ${subscriptionId} activated after payment confirmation`);
          }
        } else if (paymentStatus === 'failed') {
          // Keep subscription as 'past_due' if payment failed
          await db.query(
            `UPDATE subscriptions 
             SET status = 'past_due', updated_at = now()
             WHERE id = $1 AND status != 'past_due'`,
            [subscriptionId]
          );
        }

        fastify.log.info(`Payment ${paymentId} processed: ${paymentStatus}`);
      } else if (data.type === 'preference') {
        // Handle preference notifications
        // When a preference is updated, check if there are associated payments
        const preferenceId = data.data?.id;
        if (preferenceId) {
          try {
            const preference = await getPreference(preferenceId);
            fastify.log.info('Preference notification received:', preferenceId);
            
            // If preference has an external_reference (subscription ID), check for payments
            if (preference.external_reference) {
              const subscriptionId = preference.external_reference;
              
              // Check if there are any approved payments for this subscription
              const paymentCheck = await db.query(
                `SELECT id, status FROM payments 
                 WHERE subscription_id = $1 AND status = 'paid'
                 ORDER BY created_at DESC LIMIT 1`,
                [subscriptionId]
              );
              
              // If payment exists and subscription is not active, activate it
              if (paymentCheck.rows.length > 0) {
                const subCheck = await db.query(
                  'SELECT status FROM subscriptions WHERE id = $1',
                  [subscriptionId]
                );
                
                if (subCheck.rows.length > 0 && subCheck.rows[0].status !== 'active') {
                  await db.query(
                    `UPDATE subscriptions 
                     SET status = 'active', 
                         started_at = COALESCE(started_at, now()),
                         updated_at = now()
                     WHERE id = $1`,
                    [subscriptionId]
                  );
                  fastify.log.info(`Subscription ${subscriptionId} activated via preference notification`);
                }
              }
            }
          } catch (error: any) {
            fastify.log.error('Error processing preference notification:', error);
          }
        }
      }

      return reply.code(200).send({ received: true });
    } catch (error: any) {
      fastify.log.error('Error processing Mercado Pago webhook:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get payment status
  fastify.get('/payment/:paymentId', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { paymentId } = request.params as { paymentId: string };
      const payment = await getPayment(paymentId);
      return reply.send({ payment });
    } catch (error: any) {
      fastify.log.error('Error getting payment:', error);
      return reply.code(500).send({ error: 'Failed to get payment' });
    }
  });
}
