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
      
      let result;
      try {
        result = await db.query(
          `SELECT u.id, u.full_name, u.email, u.role, u.phone, u.birth_date, u.risk_profile, u.created_at, u.invited_by_id,
                  inviter.full_name as inviter_name, inviter.email as inviter_email
           FROM users u
           LEFT JOIN users inviter ON inviter.id = u.invited_by_id
           WHERE u.id = $1`,
          [userId]
        );
      } catch {
        result = await db.query(
          `SELECT id, full_name, email, role, phone, birth_date, risk_profile, created_at
           FROM users WHERE id = $1`,
          [userId]
        );
      }
      
      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'User not found' });
      }
      
      const row = result.rows[0];
      const user: any = {
        id: row.id,
        full_name: row.full_name,
        email: row.email,
        role: row.role,
        phone: row.phone,
        birth_date: row.birth_date,
        risk_profile: row.risk_profile,
        created_at: row.created_at,
      };
      if (row.invited_by_id != null && row.inviter_name) {
        user.invitedBy = { id: row.invited_by_id, name: row.inviter_name, email: row.inviter_email };
      }
      // Referral: count users this user invited (for 20% discount eligibility)
      try {
        const countResult = await db.query(
          `SELECT COUNT(*)::int as count FROM users WHERE invited_by_id = $1`,
          [userId]
        );
        const invitedCount = countResult.rows[0]?.count ?? 0;
        user.invitedCount = invitedCount;
        user.referralDiscountEligible = invitedCount >= 10;
      } catch {
        user.invitedCount = 0;
        user.referralDiscountEligible = false;
      }
      return reply.send({ user });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get user statistics (total users and online users)
  fastify.get('/stats/user-counts', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Get total users
      const totalUsersResult = await db.query(
        "SELECT COUNT(*) as count FROM users WHERE role IN ('customer', 'consultant')"
      );
      const totalUsers = parseInt(totalUsersResult.rows[0].count || '0', 10);

      // Get online users (unique users with successful login in the last 15 minutes)
      // Check if login_history table exists first
      let onlineUsers = 0;
      try {
        const onlineUsersResult = await db.query(
          `SELECT COUNT(DISTINCT user_id) as count 
           FROM login_history 
           WHERE success = true 
           AND created_at >= NOW() - INTERVAL '15 minutes'`
        );
        onlineUsers = parseInt(onlineUsersResult.rows[0].count || '0', 10);
      } catch (e) {
        // Table might not exist or other error, fallback to 1 (current user)
        onlineUsers = 1;
      }

      // Ensure onlineUsers is at least 1 (the current user)
      onlineUsers = Math.max(onlineUsers, 1);

      return reply.send({
        totalUsers,
        onlineUsers
      });
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
