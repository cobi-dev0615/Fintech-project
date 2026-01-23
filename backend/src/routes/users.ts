import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';
import bcrypt from 'bcrypt';

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
      if (body.country_code) {
        updates.push(`country_code = $${paramCount++}`);
        values.push(body.country_code);
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
         RETURNING id, full_name, email, role, phone, country_code, birth_date, risk_profile`,
        values
      );
      
      return reply.send({ user: result.rows[0] });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Change password
  fastify.patch('/profile/password', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const body = request.body as any;
      
      if (!body.currentPassword || !body.newPassword) {
        return reply.code(400).send({ error: 'Current password and new password are required' });
      }

      if (body.newPassword.length < 6) {
        return reply.code(400).send({ error: 'New password must be at least 6 characters long' });
      }

      // Get user with password hash
      const userResult = await db.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return reply.code(404).send({ error: 'User not found' });
      }

      const user = userResult.rows[0];

      // Verify current password
      if (!user.password_hash) {
        return reply.code(400).send({ error: 'Password cannot be changed. Account uses external authentication.' });
      }

      const validPassword = await bcrypt.compare(body.currentPassword, user.password_hash);
      
      if (!validPassword) {
        return reply.code(401).send({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(body.newPassword, 10);

      // Update password
      await db.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newPasswordHash, userId]
      );

      return reply.send({ message: 'Password updated successfully' });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error', details: error.message });
    }
  });
}
