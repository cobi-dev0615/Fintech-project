import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';

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
        `SELECT id, content, reply, replied_at, created_at
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
      const { content } = request.body as { content: string };

      if (!content) {
        return reply.code(400).send({ error: 'Content is required' });
      }

      const result = await db.query(
        `INSERT INTO comments (user_id, content)
         VALUES ($1, $2)
         RETURNING id, content, created_at`,
        [userId, content]
      );

      return reply.code(201).send({
        comment: result.rows[0],
        message: 'Comment sent to administrator'
      });
    } catch (error: any) {
      fastify.log.error('Error adding comment:', error);
      reply.code(500).send({ error: 'Failed to add comment', details: error.message });
    }
  });
}
