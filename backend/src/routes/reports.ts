import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';

export async function reportsRoutes(fastify: FastifyInstance) {
  // Get user's reports
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;

      const result = await db.query(
        `SELECT 
          id,
          type,
          params_json,
          file_url,
          created_at
        FROM reports
        WHERE owner_user_id = $1
        ORDER BY created_at DESC`,
        [userId]
      );

      const reports = result.rows.map(row => ({
        id: row.id,
        type: row.type,
        generatedAt: new Date(row.created_at).toLocaleDateString('pt-BR'),
        status: row.file_url ? 'generated' : 'pending',
        downloadUrl: row.file_url,
      }));

      return reply.send({ reports });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Generate report
  fastify.post('/generate', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { type, dateRange, params } = request.body as any;

      if (!type) {
        return reply.code(400).send({ error: 'Report type is required' });
      }

      // Create report record
      const result = await db.query(
        `INSERT INTO reports (owner_user_id, target_user_id, type, params_json)
         VALUES ($1, $1, $2, $3)
         RETURNING id, created_at`,
        [userId, type, JSON.stringify({ dateRange, ...params })]
      );

      // TODO: Actually generate PDF report here
      // For now, we'll just return the report record

      return reply.send({
        report: {
          id: result.rows[0].id,
          type,
          generatedAt: new Date(result.rows[0].created_at).toLocaleDateString('pt-BR'),
          status: 'pending',
        },
        message: 'Report generation started. It will be available shortly.',
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}

