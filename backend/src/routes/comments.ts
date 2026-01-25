import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';
import { createAlert } from '../utils/notifications.js';

export async function commentsRoutes(fastify: FastifyInstance) {
  // Get user's comments
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { page = '1', limit = '10' } = request.query as any;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Check if comments table exists
      try {
        await db.query('SELECT 1 FROM comments LIMIT 1');
      } catch {
        return reply.send({ comments: [], pagination: { total: 0, totalPages: 0, page: parseInt(page), limit: parseInt(limit) } });
      }

      // Get total count
      const countResult = await db.query(
        'SELECT COUNT(*) as total FROM comments WHERE user_id = $1',
        [userId]
      );
      const total = parseInt(countResult.rows[0].total);

      // Get comments
      const result = await db.query(
        `SELECT id, title, content, reply, status, processed_at, created_at
         FROM comments
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, parseInt(limit), offset]
      );

      return reply.send({
        comments: result.rows,
        pagination: {
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
          page: parseInt(page),
          limit: parseInt(limit)
        }
      });
    } catch (error: any) {
      fastify.log.error('Error fetching comments:', error);
      reply.code(500).send({ error: 'Failed to fetch comments', details: error.message });
    }
  });

  // Add a new comment
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { title, content } = request.body as { title: string; content: string };

      if (!content) {
        return reply.code(400).send({ error: 'Content is required' });
      }

      const result = await db.query(
        `INSERT INTO comments (user_id, title, content)
         VALUES ($1, $2, $3)
         RETURNING id, title, content, created_at`,
        [userId, title || null, content]
      );

      // Get user info for notification
      const userResult = await db.query(
        'SELECT full_name, email, role FROM users WHERE id = $1',
        [userId]
      );
      const user = userResult.rows[0];
      const userName = user?.full_name || 'Usuário';
      const userRole = user?.role || 'customer';

      // Notify all admins about the new comment
      try {
        const adminsResult = await db.query(
          'SELECT id FROM users WHERE role = $1',
          ['admin']
        );
        
        for (const admin of adminsResult.rows) {
          await createAlert({
            userId: admin.id,
            severity: 'info',
            title: 'Novo Comentário Recebido',
            message: `${userName} enviou um novo comentário: ${title || 'Sem título'}`,
            notificationType: 'message_received',
            linkUrl: `/admin/comments`,
            metadata: {
              commentId: result.rows[0].id,
              userId,
              userName,
              userRole,
            },
          });
        }

        // Broadcast to connected admin WebSocket clients
        const websocket = (fastify as any).websocket;
        if (websocket && websocket.broadcastToAdmins) {
          websocket.broadcastToAdmins({
            type: 'new_comment',
            message: 'Novo comentário recebido',
            commentId: result.rows[0].id,
            userId,
            userName,
            userRole,
            title: title || 'Sem título',
            content: content.substring(0, 100), // First 100 chars
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        // Don't fail the request if notification fails
        fastify.log.error({ err: error }, 'Error sending notification for new comment');
      }

      return reply.code(201).send({
        comment: result.rows[0],
        message: 'Comment sent to administrator'
      });
    } catch (error: any) {
      fastify.log.error('Error adding comment:', error);
      reply.code(500).send({ error: 'Failed to add comment', details: error.message });
    }
  });

  // Delete a comment
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { id } = request.params as { id: string };

      const result = await db.query(
        'DELETE FROM comments WHERE id = $1 AND user_id = $2 RETURNING id',
        [id, userId]
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
}
