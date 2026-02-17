import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';

export async function reportsRoutes(fastify: FastifyInstance) {

  // ── List reports ────────────────────────────────────────────────────────
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;

      // Check if reports table exists
      try {
        await db.query('SELECT 1 FROM reports LIMIT 1');
      } catch {
        return reply.send({ reports: [] });
      }

      const result = await db.query(
        `SELECT id, type, params_json, file_url, created_at
         FROM reports
         WHERE owner_user_id = $1
         ORDER BY created_at DESC
         LIMIT 100`,
        [userId]
      );

      const reports = result.rows.map(row => ({
        id: row.id,
        type: row.type,
        params: row.params_json || {},
        generatedAt: row.created_at,
        status: row.file_url ? 'completed' : 'processing',
        downloadUrl: row.file_url || null,
      }));

      return { reports };
    } catch (error) {
      fastify.log.error(`Error listing reports: ${error}`);
      reply.code(500).send({ error: 'Failed to list reports' });
    }
  });

  // ── Generate report ─────────────────────────────────────────────────────
  fastify.post('/generate', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { type, dateRange, params } = request.body as {
        type: string;
        dateRange?: string;
        params?: Record<string, any>;
      };

      if (!type) {
        return reply.code(400).send({ error: 'Report type is required' });
      }

      // Validate report type against known types; fall back to 'consolidated' if unknown
      const validTypes = ['consolidated', 'transactions', 'monthly_evolution', 'advisor_custom', 'portfolio_analysis'];
      const reportType = validTypes.includes(type) ? type : 'consolidated';

      // Check if reports table exists
      try {
        await db.query('SELECT 1 FROM reports LIMIT 1');
      } catch {
        return reply.code(500).send({ error: 'Reports table not available' });
      }

      const paramsJson = {
        ...(params || {}),
        dateRange: dateRange || null,
      };

      // Try inserting with the exact type first; if the enum rejects it, use 'consolidated'
      let result;
      try {
        result = await db.query(
          `INSERT INTO reports (owner_user_id, type, params_json)
           VALUES ($1, $2, $3)
           RETURNING id, type, created_at`,
          [userId, reportType, JSON.stringify(paramsJson)]
        );
      } catch (enumErr: any) {
        // If the enum doesn't include this type, fall back
        if (enumErr.code === '22P02') {
          result = await db.query(
            `INSERT INTO reports (owner_user_id, type, params_json)
             VALUES ($1, 'consolidated', $2)
             RETURNING id, type, created_at`,
            [userId, JSON.stringify({ ...paramsJson, originalType: reportType })]
          );
        } else {
          throw enumErr;
        }
      }

      const row = result.rows[0];

      return {
        report: {
          id: row.id,
          type: row.type,
          generatedAt: row.created_at,
          status: 'processing',
        },
        message: 'Report generation started successfully',
      };
    } catch (error) {
      fastify.log.error(`Error generating report: ${error}`);
      reply.code(500).send({ error: 'Failed to generate report' });
    }
  });

  // ── Delete report ───────────────────────────────────────────────────────
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { id } = request.params as { id: string };

      const result = await db.query(
        `DELETE FROM reports WHERE id = $1 AND owner_user_id = $2 RETURNING id`,
        [id, userId]
      );

      if (result.rowCount === 0) {
        return reply.code(404).send({ error: 'Report not found' });
      }

      return { ok: true, message: 'Report deleted' };
    } catch (error) {
      fastify.log.error(`Error deleting report: ${error}`);
      reply.code(500).send({ error: 'Failed to delete report' });
    }
  });
}
