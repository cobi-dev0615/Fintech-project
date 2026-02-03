import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';
import { cache } from '../utils/cache.js';
import { createAlert } from '../utils/notifications.js';

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

  // Helper to get customer ID from request (JWT may use userId or id)
  const getCustomerId = (request: any): string => {
    return (request.user as any).userId ?? (request.user as any).id;
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

      // Update status to active and enable wallet sharing (customer can disable later)
      const result = await db.query(
        `UPDATE customer_consultants 
         SET status = 'active', can_view_all = true, updated_at = NOW()
         WHERE id = $1 AND customer_id = $2
         RETURNING id, consultant_id, status`,
        [id, customerId]
      );

      // Clear consultant dashboard cache
      cache.delete(`consultant:${invitation.consultant_id}:dashboard:metrics`);

      // Get customer name for notification
      const customerResult = await db.query(
        `SELECT full_name FROM users WHERE id = $1`,
        [customerId]
      );
      const customerName = customerResult.rows[0]?.full_name || 'Um cliente';

      // Create notification for the consultant
      await createAlert({
        userId: invitation.consultant_id,
        severity: 'info',
        title: 'Convite aceito',
        message: `${customerName} aceitou seu convite e agora você pode acessar os dados financeiros dele.`,
        notificationType: 'consultant_invitation',
        linkUrl: `/consultant/clients/${customerId}`,
        metadata: {
          customerId,
          customerName,
          invitationId: id,
          action: 'accepted',
        },
      });

      // Broadcast WebSocket notification to consultant for real-time update
      const websocket = (fastify as any).websocket;
      if (websocket?.broadcastToUser) {
        websocket.broadcastToUser(invitation.consultant_id, {
          type: 'invitation_accepted',
          customerName,
          customerId,
          invitationId: id,
          message: `${customerName} aceitou seu convite`,
        });
      }

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
        `SELECT cc.consultant_id, cc.status, u.full_name as customer_name
         FROM customer_consultants cc
         JOIN users u ON u.id = cc.customer_id
         WHERE cc.id = $1 AND cc.customer_id = $2`,
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

      const consultantId = invitation.consultant_id;
      const customerName = invitation.customer_name || 'Um cliente';

      // Delete the invitation (or mark as declined)
      await db.query(
        `DELETE FROM customer_consultants WHERE id = $1 AND customer_id = $2`,
        [id, customerId]
      );

      // Clear consultant dashboard cache
      cache.delete(`consultant:${consultantId}:dashboard:metrics`);

      // Notify consultant in real time
      const websocket = (fastify as any).websocket;
      if (websocket?.broadcastToUser) {
        websocket.broadcastToUser(consultantId, {
          type: 'invitation_declined',
          invitationId: id,
          customerName,
          message: `${customerName} recusou seu convite`,
        });
      }

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
        canViewAll?: boolean;
      }> = [];

      try {
        const result = await db.query(
          `SELECT 
             cc.id,
             cc.consultant_id,
             u.full_name as name,
             u.email,
             cc.is_primary,
             cc.status,
             COALESCE(cc.can_view_all, true) as can_view_all
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
          canViewAll: row.can_view_all,
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

  // Disconnect from a consultant (revoke connection)
  fastify.post('/consultants/:id/disconnect', {
    preHandler: [requireCustomer],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const customerId = getCustomerId(request);
      const { id } = request.params as { id: string };

      const result = await db.query(
        `DELETE FROM customer_consultants
         WHERE id = $1 AND customer_id = $2 AND status = 'active'
         RETURNING consultant_id`,
        [id, customerId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Consultant link not found or already disconnected' });
      }

      cache.delete(`consultant:${result.rows[0].consultant_id}:dashboard:metrics`);
      return reply.send({ message: 'Desconectado do consultor com sucesso' });
    } catch (error: any) {
      fastify.log.error('Error disconnecting consultant:', error);
      reply.code(500).send({ error: 'Failed to disconnect', details: error.message });
    }
  });

  // Update consultant permissions (share / stop sharing wallet info)
  fastify.patch('/consultants/:id', {
    preHandler: [requireCustomer],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const customerId = getCustomerId(request);
      const { id } = request.params as { id: string };
      const body = request.body as { can_view_all?: boolean };

      const result = await db.query(
        `UPDATE customer_consultants
         SET can_view_all = COALESCE($3, can_view_all), updated_at = NOW()
         WHERE id = $1 AND customer_id = $2 AND status = 'active'
         RETURNING id, can_view_all, consultant_id`,
        [id, customerId, body.can_view_all]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Consultant link not found' });
      }

      const canViewAll = result.rows[0].can_view_all;
      const consultantId = result.rows[0].consultant_id;

      // Customer name for consultant notification
      const customerResult = await db.query(
        `SELECT full_name FROM users WHERE id = $1`,
        [customerId]
      );
      const customerName = customerResult.rows[0]?.full_name || 'Cliente';

      const title = canViewAll ? 'Carteira compartilhada' : 'Compartilhamento de carteira desativado';
      const message = canViewAll
        ? `${customerName} ativou o compartilhamento da carteira com você.`
        : `${customerName} desativou o compartilhamento da carteira.`;

      await createAlert({
        userId: consultantId,
        severity: 'info',
        title,
        message,
        notificationType: 'consultant_assignment',
        linkUrl: '/consultant/clients',
        metadata: { customerId, customerName, canViewAll, linkId: id },
      });

      const websocket = (fastify as any).websocket;
      if (websocket?.broadcastToUser) {
        websocket.broadcastToUser(consultantId, {
          type: 'wallet_shared_updated',
          customerName,
          canViewAll,
          message,
        });
      }

      return reply.send({
        id: result.rows[0].id,
        canViewAll,
        message: canViewAll ? 'Compartilhamento de carteira ativado' : 'Compartilhamento de carteira desativado',
      });
    } catch (error: any) {
      fastify.log.error('Error updating consultant permissions:', error);
      reply.code(500).send({ error: 'Failed to update permissions', details: error.message });
    }
  });

  // --- Messages (conversations with consultants) ---

  // Get conversations (customer sees their consultants)
  fastify.get('/messages/conversations', {
    preHandler: [requireCustomer],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const customerId = getCustomerId(request);

      let hasConversations = false;
      let hasMessages = false;
      try {
        await db.query('SELECT 1 FROM conversations LIMIT 1');
        hasConversations = true;
      } catch {}
      try {
        await db.query('SELECT 1 FROM messages LIMIT 1');
        hasMessages = true;
      } catch {}

      if (!hasConversations) {
        return { conversations: [] };
      }

      let conversations: Array<{
        id: string;
        consultantId: string;
        consultantName: string;
        lastMessage: string;
        timestamp: string;
        unread: number;
      }> = [];

      try {
        let query = `
          SELECT 
            c.id,
            c.consultant_id,
            u.full_name as consultant_name,
        `;
        if (hasMessages) {
          query += `
            (SELECT body FROM messages 
             WHERE conversation_id = c.id 
             ORDER BY created_at DESC LIMIT 1) as last_message,
            (SELECT created_at FROM messages 
             WHERE conversation_id = c.id 
             ORDER BY created_at DESC LIMIT 1) as last_message_time,
            (SELECT COUNT(*) FROM messages 
             WHERE conversation_id = c.id 
             AND sender_id != $1 
             AND is_read = FALSE) as unread_count,
          `;
        } else {
          query += `
            NULL as last_message,
            NULL as last_message_time,
            0 as unread_count,
          `;
        }
        query += `
            c.updated_at
          FROM conversations c
          JOIN users u ON c.consultant_id = u.id
          WHERE c.customer_id = $1
          ORDER BY c.updated_at DESC
        `;

        const result = await db.query(query, [customerId]);
        conversations = result.rows.map((row: any) => ({
          id: row.id,
          consultantId: row.consultant_id,
          consultantName: row.consultant_name || 'Consultor',
          lastMessage: row.last_message || 'Nenhuma mensagem',
          timestamp: row.last_message_time
            ? new Date(row.last_message_time).toISOString()
            : row.updated_at
            ? new Date(row.updated_at).toISOString()
            : new Date().toISOString(),
          unread: parseInt(row.unread_count) || 0,
        }));
      } catch (error: any) {
        fastify.log.warn('Error fetching conversations:', error.message);
      }

      return { conversations };
    } catch (error: any) {
      fastify.log.error('Error fetching conversations:', error);
      reply.code(500).send({ error: 'Failed to fetch conversations', details: error.message });
    }
  });

  // Get messages for a conversation
  fastify.get('/messages/conversations/:id', {
    preHandler: [requireCustomer],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const customerId = getCustomerId(request);
      const { id } = request.params as any;

      const accessCheck = await db.query(
        `SELECT 1 FROM conversations 
         WHERE id = $1 AND customer_id = $2`,
        [id, customerId]
      );

      if (accessCheck.rows.length === 0) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      const convResult = await db.query(
        `SELECT c.id, c.consultant_id, u.full_name as consultant_name
         FROM conversations c
         JOIN users u ON c.consultant_id = u.id
         WHERE c.id = $1`,
        [id]
      );

      if (convResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Conversation not found' });
      }

      const messagesResult = await db.query(
        `SELECT 
           m.id,
           m.sender_id,
           m.body,
           m.created_at as timestamp,
           u.role
         FROM messages m
         JOIN users u ON m.sender_id = u.id
         WHERE m.conversation_id = $1
         ORDER BY m.created_at ASC`,
        [id]
      );

      await db.query(
        `UPDATE messages 
         SET is_read = TRUE 
         WHERE conversation_id = $1 AND sender_id != $2 AND is_read = FALSE`,
        [id, customerId]
      );

      const messages = messagesResult.rows.map((row: any) => ({
        id: row.id,
        sender: row.role === 'consultant' ? 'consultant' : 'client',
        content: row.body,
        timestamp: new Date(row.timestamp).toISOString(),
      }));

      return {
        conversation: {
          id: convResult.rows[0].id,
          consultantId: convResult.rows[0].consultant_id,
          consultantName: convResult.rows[0].consultant_name,
        },
        messages,
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Send message
  fastify.post('/messages/conversations/:id/messages', {
    preHandler: [requireCustomer],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const customerId = getCustomerId(request);
      const { id } = request.params as any;
      const { body } = request.body as any;

      if (!body || !body.trim()) {
        return reply.code(400).send({ error: 'Message body is required' });
      }

      const accessCheck = await db.query(
        `SELECT consultant_id FROM conversations 
         WHERE id = $1 AND customer_id = $2`,
        [id, customerId]
      );

      if (accessCheck.rows.length === 0) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      const consultantId = accessCheck.rows[0].consultant_id;

      const result = await db.query(
        `INSERT INTO messages (conversation_id, sender_id, body)
         VALUES ($1, $2, $3)
         RETURNING id, body, created_at`,
        [id, customerId, body.trim()]
      );

      await db.query(
        `UPDATE conversations SET updated_at = NOW() WHERE id = $1`,
        [id]
      );

      const messagePayload = {
        id: result.rows[0].id,
        sender: 'client',
        content: result.rows[0].body,
        timestamp: new Date(result.rows[0].created_at).toISOString(),
      };

      // Broadcast to consultant for real-time update
      const websocket = (fastify as any).websocket;
      if (websocket?.broadcastToUser && consultantId) {
        websocket.broadcastToUser(consultantId, {
          type: 'new_message',
          conversationId: id,
          message: messagePayload,
        });
      }

      return {
        message: messagePayload,
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Clear message history (delete all messages in conversation, keep conversation)
  fastify.delete('/messages/conversations/:id/messages', {
    preHandler: [requireCustomer],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const customerId = getCustomerId(request);
      const { id } = request.params as any;

      const accessCheck = await db.query(
        `SELECT consultant_id FROM conversations WHERE id = $1 AND customer_id = $2`,
        [id, customerId]
      );

      if (accessCheck.rows.length === 0) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      const consultantId = accessCheck.rows[0].consultant_id;

      await db.query(`DELETE FROM messages WHERE conversation_id = $1`, [id]);
      await db.query(`UPDATE conversations SET updated_at = NOW() WHERE id = $1`, [id]);

      const websocket = (fastify as any).websocket;
      if (websocket?.broadcastToUser && consultantId) {
        websocket.broadcastToUser(consultantId, { type: 'conversation_cleared', conversationId: id });
      }

      return { message: 'History cleared successfully' };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Delete chat (delete entire conversation and messages)
  fastify.delete('/messages/conversations/:id', {
    preHandler: [requireCustomer],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const customerId = getCustomerId(request);
      const { id } = request.params as any;

      const accessCheck = await db.query(
        `SELECT consultant_id FROM conversations WHERE id = $1 AND customer_id = $2`,
        [id, customerId]
      );

      if (accessCheck.rows.length === 0) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      const consultantId = accessCheck.rows[0].consultant_id;

      await db.query(`DELETE FROM conversations WHERE id = $1`, [id]);

      const websocket = (fastify as any).websocket;
      if (websocket?.broadcastToUser && consultantId) {
        websocket.broadcastToUser(consultantId, { type: 'conversation_deleted', conversationId: id });
      }

      return { message: 'Chat deleted successfully' };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // --- Referral invitations (customer invites external users via link) ---

  // Get or create invitation link for the current customer
  fastify.get('/referral-link', {
    preHandler: [requireCustomer],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const customerId = getCustomerId(request);
      // Use first origin if FRONTEND_URL has multiple (e.g. "https://zurt.com.br,https://www.zurt.com.br")
      const frontendUrlRaw = process.env.FRONTEND_URL || 'http://localhost:5173';
      const frontendUrl = frontendUrlRaw.split(',')[0].trim().replace(/\/$/, '') || 'https://www.zurt.com.br';
      let token: string;

      try {
        const existing = await db.query(
          'SELECT token FROM user_invite_links WHERE inviter_id = $1',
          [customerId]
        );
        if (existing.rows.length > 0) {
          token = existing.rows[0].token;
        } else {
          const crypto = await import('crypto');
          token = crypto.randomBytes(24).toString('base64url');
          await db.query(
            'INSERT INTO user_invite_links (inviter_id, token) VALUES ($1, $2)',
            [customerId, token]
          );
        }
      } catch (err: any) {
        if (err.code === '42P01') {
          return reply.code(503).send({ error: 'Invitation feature not available yet' });
        }
        throw err;
      }

      const link = `${frontendUrl}/register?ref=${encodeURIComponent(token)}`;
      return reply.send({ link, token });
    } catch (error: any) {
      fastify.log.error('Error getting referral link:', error);
      reply.code(500).send({ error: 'Failed to get referral link', details: error.message });
    }
  });

  // List users invited by the current customer (who registered using their link)
  fastify.get('/invited-users', {
    preHandler: [requireCustomer],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const customerId = getCustomerId(request);

      let hasInvitedBy = false;
      try {
        const col = await db.query(
          `SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'invited_by_id'`
        );
        hasInvitedBy = col.rows.length > 0;
      } catch {}

      if (!hasInvitedBy) {
        return reply.send({ invitedUsers: [], invitedCount: 0 });
      }

      const result = await db.query(
        `SELECT u.id, u.full_name, u.email, u.approval_status, u.is_active, u.created_at
         FROM users u
         WHERE u.invited_by_id = $1
         ORDER BY u.created_at DESC`,
        [customerId]
      );

      const invitedUsers = result.rows.map((row: any) => ({
        id: row.id,
        name: row.full_name,
        email: row.email,
        status: row.is_active ? (row.approval_status === 'approved' ? 'registered' : 'pending_approval') : 'inactive',
        registeredAt: row.created_at,
      }));

      return reply.send({ invitedUsers, invitedCount: invitedUsers.length });
    } catch (error: any) {
      fastify.log.error('Error fetching invited users:', error);
      reply.code(500).send({ error: 'Failed to fetch invited users', details: error.message });
    }
  });
}
