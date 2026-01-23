import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';
import {
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
  NotificationType,
} from '../utils/notifications.js';

export async function notificationsRoutes(fastify: FastifyInstance) {
  // Get all notifications for user
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { page = '1', limit = '50' } = request.query as any;
      const pageNum = Math.max(1, parseInt(page, 10));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
      const offset = (pageNum - 1) * limitNum;

      // Check if alerts table exists
      const tableExists = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'alerts'
        );
      `);

      if (!tableExists.rows[0]?.exists) {
        return reply.send({
          notifications: [],
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: 0,
            totalPages: 0,
          },
        });
      }

      // Get notifications count
      const countResult = await db.query(
        `SELECT COUNT(*) as count FROM alerts WHERE user_id = $1`,
        [userId]
      );
      const total = parseInt(countResult.rows[0]?.count || '0', 10);

      // Get notifications
      const result = await db.query(
        `SELECT id, severity, title, message, is_read, link_url, metadata_json, created_at
         FROM alerts 
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limitNum, offset]
      );

      const notifications = result.rows.map((row: any) => ({
        id: row.id,
        severity: row.severity,
        title: row.title,
        message: row.message,
        isRead: row.is_read,
        linkUrl: row.link_url,
        metadata: row.metadata_json || {},
        createdAt: row.created_at,
      }));

      return reply.send({
        notifications,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get unread count
  fastify.get('/unread-count', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;

      // Check if alerts table exists
      const tableExists = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'alerts'
        );
      `);

      if (!tableExists.rows[0]?.exists) {
        return reply.send({ count: 0 });
      }

      const result = await db.query(
        `SELECT COUNT(*) as count FROM alerts 
         WHERE user_id = $1 AND is_read = false`,
        [userId]
      );

      return reply.send({
        count: parseInt(result.rows[0]?.count || '0', 10),
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Mark notification as read
  fastify.patch('/:id/read', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { id } = request.params as any;

      // Check if alerts table exists
      const tableExists = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'alerts'
        );
      `);

      if (!tableExists.rows[0]?.exists) {
        return reply.code(503).send({ error: 'Service temporarily unavailable', message: 'Notifications table does not exist' });
      }

      // Verify notification belongs to user
      const verifyResult = await db.query(
        `SELECT id FROM alerts WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      if (verifyResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Notification not found' });
      }

      // Mark as read
      await db.query(
        `UPDATE alerts SET is_read = true, updated_at = NOW() 
         WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      return reply.send({ success: true });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Mark all as read
  fastify.patch('/read-all', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;

      // Check if alerts table exists
      const tableExists = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'alerts'
        );
      `);

      if (!tableExists.rows[0]?.exists) {
        return reply.code(503).send({ error: 'Service temporarily unavailable', message: 'Notifications table does not exist' });
      }

      await db.query(
        `UPDATE alerts SET is_read = true, updated_at = NOW() 
         WHERE user_id = $1 AND is_read = false`,
        [userId]
      );

      return reply.send({ success: true });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Delete notification
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { id } = request.params as any;

      // Check if alerts table exists
      const tableExists = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'alerts'
        );
      `);

      if (!tableExists.rows[0]?.exists) {
        return reply.code(503).send({ error: 'Service temporarily unavailable', message: 'Notifications table does not exist' });
      }

      // Verify notification belongs to user
      const verifyResult = await db.query(
        `SELECT id FROM alerts WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      if (verifyResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Notification not found' });
      }

      await db.query(`DELETE FROM alerts WHERE id = $1 AND user_id = $2`, [id, userId]);

      return reply.send({ success: true });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get user's notification preferences
  fastify.get('/preferences', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const preferences = await getUserNotificationPreferences(userId);
      return reply.send({ preferences });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update user's notification preferences
  fastify.patch('/preferences/:type', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { type } = request.params as { type: string };
      const { enabled, emailEnabled, pushEnabled } = request.body as {
        enabled?: boolean;
        emailEnabled?: boolean;
        pushEnabled?: boolean;
      };

      // Validate notification type
      const validTypes: NotificationType[] = [
        'account_activity',
        'transaction_alert',
        'investment_update',
        'report_ready',
        'message_received',
        'consultant_assignment',
        'subscription_update',
        'system_announcement',
        'goal_milestone',
        'connection_status',
      ];

      if (!validTypes.includes(type as NotificationType)) {
        return reply.code(400).send({ error: 'Invalid notification type' });
      }

      await updateUserNotificationPreferences(
        userId,
        type as NotificationType,
        {
          enabled,
          emailEnabled,
          pushEnabled,
        }
      );

      return reply.send({ success: true });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
