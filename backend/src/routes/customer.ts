import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';
import { cache } from '../utils/cache.js';

export async function customerRoutes(fastify: FastifyInstance) {
  // Middleware: Only customers can access these routes
  const requireCustomer = async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
      if ((request.user as any).role !== 'customer') {
        reply.code(403).send({ error: 'Access denied. Customer role required.' });
        return;
      }
    } catch (err) {
      reply.send(err);
    }
  };

  // Helper to get customer ID from request
  const getCustomerId = (request: any): string => {
    return (request.user as any).id;
  };

  // Get Pending Invitations
  fastify.get('/invitations', {
    preHandler: [requireCustomer],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const customerId = getCustomerId(request);

      // Check if customer_consultants table exists
      let hasCustomerConsultants = false;
      try {
        await db.query('SELECT 1 FROM customer_consultants LIMIT 1');
        hasCustomerConsultants = true;
      } catch {
        hasCustomerConsultants = false;
      }

      if (!hasCustomerConsultants) {
        return { invitations: [] };
      }

      let invitations: Array<{
        id: string;
        consultantId: string;
        consultantName: string;
        consultantEmail: string;
        status: string;
        sentAt: string;
        expiresAt: string | null;
        message?: string;
      }> = [];

      try {
        const result = await db.query(
          `SELECT 
             cc.id,
             cc.consultant_id,
             u.full_name as consultant_name,
             u.email as consultant_email,
             cc.status,
             cc.created_at as sent_at,
             cc.created_at + INTERVAL '30 days' as expires_at
           FROM customer_consultants cc
           JOIN users u ON cc.consultant_id = u.id
           WHERE cc.customer_id = $1 AND cc.status = 'pending'
           ORDER BY cc.created_at DESC`,
          [customerId]
        );

        invitations = result.rows.map(row => ({
          id: row.id,
          consultantId: row.consultant_id,
          consultantName: row.consultant_name || 'Consultor',
          consultantEmail: row.consultant_email,
          status: row.status,
          sentAt: new Date(row.sent_at).toISOString(),
          expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
        }));
      } catch (error: any) {
        fastify.log.warn('Error fetching invitations:', error.message);
      }

      return { invitations };
    } catch (error: any) {
      fastify.log.error('Error fetching invitations:', error);
      reply.code(500).send({ error: 'Failed to fetch invitations', details: error.message });
    }
  });

  // Accept Invitation
  fastify.post('/invitations/:id/accept', {
    preHandler: [requireCustomer],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const customerId = getCustomerId(request);
      const { id } = request.params as any;

      // Check if invitation exists and belongs to this customer
      const invitationResult = await db.query(
        `SELECT consultant_id, status, created_at + INTERVAL '30 days' as expires_at
         FROM customer_consultants
         WHERE id = $1 AND customer_id = $2`,
        [id, customerId]
      );

      if (invitationResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Invitation not found' });
      }

      const invitation = invitationResult.rows[0];

      // Check if invitation is expired
      if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
        // Update status to expired
        await db.query(
          `UPDATE customer_consultants SET status = 'expired' WHERE id = $1`,
          [id]
        );
        return reply.code(400).send({ error: 'Invitation has expired' });
      }

      // Check if already accepted
      if (invitation.status === 'active') {
        return reply.code(400).send({ error: 'Invitation already accepted' });
      }

      // Update status to active
      const result = await db.query(
        `UPDATE customer_consultants 
         SET status = 'active', updated_at = NOW()
         WHERE id = $1 AND customer_id = $2
         RETURNING id, consultant_id, status`,
        [id, customerId]
      );

      // Clear consultant dashboard cache
      cache.delete(`consultant:${invitation.consultant_id}:dashboard:metrics`);

      return {
        invitation: {
          id: result.rows[0].id,
          consultantId: result.rows[0].consultant_id,
          status: result.rows[0].status,
        },
      };
    } catch (error: any) {
      fastify.log.error('Error accepting invitation:', error);
      reply.code(500).send({ error: 'Failed to accept invitation', details: error.message });
    }
  });

  // Decline Invitation
  fastify.post('/invitations/:id/decline', {
    preHandler: [requireCustomer],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const customerId = getCustomerId(request);
      const { id } = request.params as any;

      // Check if invitation exists and belongs to this customer
      const invitationResult = await db.query(
        `SELECT consultant_id, status FROM customer_consultants
         WHERE id = $1 AND customer_id = $2`,
        [id, customerId]
      );

      if (invitationResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Invitation not found' });
      }

      const invitation = invitationResult.rows[0];

      // Check if already accepted
      if (invitation.status === 'active') {
        return reply.code(400).send({ error: 'Cannot decline an accepted invitation' });
      }

      // Delete the invitation (or mark as declined)
      await db.query(
        `DELETE FROM customer_consultants WHERE id = $1 AND customer_id = $2`,
        [id, customerId]
      );

      // Clear consultant dashboard cache
      cache.delete(`consultant:${invitation.consultant_id}:dashboard:metrics`);

      return { message: 'Invitation declined' };
    } catch (error: any) {
      fastify.log.error('Error declining invitation:', error);
      reply.code(500).send({ error: 'Failed to decline invitation', details: error.message });
    }
  });

  // Get Active Consultants (accepted invitations)
  fastify.get('/consultants', {
    preHandler: [requireCustomer],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const customerId = getCustomerId(request);

      let consultants: Array<{
        id: string;
        consultantId: string;
        name: string;
        email: string;
        isPrimary: boolean;
        status: string;
      }> = [];

      try {
        const result = await db.query(
          `SELECT 
             cc.id,
             cc.consultant_id,
             u.full_name as name,
             u.email,
             cc.is_primary,
             cc.status
           FROM customer_consultants cc
           JOIN users u ON cc.consultant_id = u.id
           WHERE cc.customer_id = $1 AND cc.status = 'active'
           ORDER BY cc.is_primary DESC, cc.created_at ASC`,
          [customerId]
        );

        consultants = result.rows.map(row => ({
          id: row.id,
          consultantId: row.consultant_id,
          name: row.name || 'Consultor',
          email: row.email,
          isPrimary: row.is_primary,
          status: row.status,
        }));
      } catch (error: any) {
        fastify.log.warn('Error fetching consultants:', error.message);
      }

      return { consultants };
    } catch (error: any) {
      fastify.log.error('Error fetching consultants:', error);
      reply.code(500).send({ error: 'Failed to fetch consultants', details: error.message });
    }
  });
}
