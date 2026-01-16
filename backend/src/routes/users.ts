import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';

export async function usersRoutes(fastify: FastifyInstance) {
  // Get user profile
  fastify.get('/profile', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      
      const result = await db.query(
        `SELECT id, full_name, email, role, phone, birth_date, risk_profile, created_at
         FROM users WHERE id = $1`,
        [userId]
      );
      
      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'User not found' });
      }
      
      return reply.send({ user: result.rows[0] });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
  
  // Update user profile
  fastify.patch('/profile', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const body = request.body as any;
      
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
      if (body.full_name) {
        updates.push(`full_name = $${paramCount++}`);
        values.push(body.full_name);
      }
      if (body.phone) {
        updates.push(`phone = $${paramCount++}`);
        values.push(body.phone);
      }
      if (body.birth_date) {
        updates.push(`birth_date = $${paramCount++}`);
        values.push(body.birth_date);
      }
      if (body.risk_profile) {
        updates.push(`risk_profile = $${paramCount++}`);
        values.push(body.risk_profile);
      }
      
      if (updates.length === 0) {
        return reply.code(400).send({ error: 'No fields to update' });
      }
      
      values.push(userId);
      
      const result = await db.query(
        `UPDATE users SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${paramCount}
         RETURNING id, full_name, email, role, phone, birth_date, risk_profile`,
        values
      );
      
      return reply.send({ user: result.rows[0] });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
