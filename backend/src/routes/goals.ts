import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';

export async function goalsRoutes(fastify: FastifyInstance) {
  // Get all goals
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;

      // Check if goals table exists
      let hasGoals = false;
      try {
        await db.query('SELECT 1 FROM goals LIMIT 1');
        hasGoals = true;
      } catch {}

      if (!hasGoals) {
        return reply.send({ goals: [] });
      }

      const result = await db.query(
        `SELECT 
          id,
          title,
          target_amount_cents,
          current_amount_cents,
          currency,
          target_date,
          notes,
          created_at,
          updated_at
        FROM goals
        WHERE user_id = $1
        ORDER BY target_date ASC NULLS LAST, created_at DESC`,
        [userId]
      );

      const goals = result.rows.map(row => ({
        id: row.id,
        name: row.title,
        target: parseFloat(row.target_amount_cents) / 100,
        current: parseFloat(row.current_amount_cents) / 100,
        deadline: row.target_date ? new Date(row.target_date).toLocaleDateString('pt-BR') : null,
        category: row.notes || 'Geral',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      return reply.send({ goals });
    } catch (error: any) {
      fastify.log.error('Error fetching goals:', error);
      // Return empty array instead of error to prevent frontend crashes
      return reply.send({ goals: [] });
    }
  });

  // Create goal
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { name, target, deadline, category } = request.body as any;

      if (!name || !target) {
        return reply.code(400).send({ error: 'Goal name and target are required' });
      }

      // Check if goals table exists, create if it doesn't
      let hasGoals = false;
      try {
        await db.query('SELECT 1 FROM goals LIMIT 1');
        hasGoals = true;
      } catch {
        // Table doesn't exist, try to create it
        try {
          await db.query(`
            CREATE TABLE IF NOT EXISTS goals (
              id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              title              TEXT NOT NULL,
              target_amount_cents BIGINT NOT NULL,
              current_amount_cents BIGINT NOT NULL DEFAULT 0,
              currency           TEXT NOT NULL DEFAULT 'BRL',
              target_date        DATE,
              notes              TEXT,
              created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
              updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
            )
          `);
          await db.query('CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id)');
          hasGoals = true;
          fastify.log.info('Goals table created successfully');
        } catch (createError: any) {
          fastify.log.error('Error creating goals table:', createError);
          return reply.code(503).send({ 
            error: 'Service temporarily unavailable',
            message: 'Goal creation is currently unavailable. Please try again later.'
          });
        }
      }

      const targetCents = Math.round(parseFloat(target) * 100);
      const targetDate = deadline ? new Date(deadline).toISOString().split('T')[0] : null;

      const result = await db.query(
        `INSERT INTO goals (user_id, title, target_amount_cents, current_amount_cents, target_date, notes)
         VALUES ($1, $2, $3, 0, $4, $5)
         RETURNING id, title, target_amount_cents, current_amount_cents, target_date, notes, created_at`,
        [userId, name, targetCents, targetDate, category || null]
      );

      const goal = result.rows[0];
      return reply.send({
        goal: {
          id: goal.id,
          name: goal.title,
          target: parseFloat(goal.target_amount_cents) / 100,
          current: parseFloat(goal.current_amount_cents) / 100,
          deadline: goal.target_date ? new Date(goal.target_date).toLocaleDateString('pt-BR') : null,
          category: goal.notes || 'Geral',
        },
      });
    } catch (error: any) {
      fastify.log.error('Error creating goal:', error);
      return reply.code(500).send({ error: 'Internal server error', details: error.message });
    }
  });

  // Update goal
  fastify.patch('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { id } = request.params as any;
      const { name, target, current, deadline, category } = request.body as any;

      // Check if goals table exists, create if it doesn't
      let hasGoals = false;
      try {
        await db.query('SELECT 1 FROM goals LIMIT 1');
        hasGoals = true;
      } catch {
        // Table doesn't exist, try to create it
        try {
          await db.query(`
            CREATE TABLE IF NOT EXISTS goals (
              id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              title              TEXT NOT NULL,
              target_amount_cents BIGINT NOT NULL,
              current_amount_cents BIGINT NOT NULL DEFAULT 0,
              currency           TEXT NOT NULL DEFAULT 'BRL',
              target_date        DATE,
              notes              TEXT,
              created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
              updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
            )
          `);
          await db.query('CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id)');
          hasGoals = true;
          fastify.log.info('Goals table created successfully');
        } catch (createError: any) {
          fastify.log.error('Error creating goals table:', createError);
          return reply.code(503).send({ 
            error: 'Service temporarily unavailable',
            message: 'Goal updates are currently unavailable. Please try again later.'
          });
        }
      }

      // Verify ownership
      const checkResult = await db.query(
        'SELECT id FROM goals WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (checkResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Goal not found' });
      }

      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (name !== undefined) {
        updates.push(`title = $${paramIndex++}`);
        params.push(name);
      }
      if (target !== undefined) {
        updates.push(`target_amount_cents = $${paramIndex++}`);
        params.push(Math.round(parseFloat(target) * 100));
      }
      if (current !== undefined) {
        updates.push(`current_amount_cents = $${paramIndex++}`);
        params.push(Math.round(parseFloat(current) * 100));
      }
      if (deadline !== undefined) {
        updates.push(`target_date = $${paramIndex++}`);
        params.push(deadline ? new Date(deadline).toISOString().split('T')[0] : null);
      }
      if (category !== undefined) {
        updates.push(`notes = $${paramIndex++}`);
        params.push(category || null);
      }

      if (updates.length === 0) {
        return reply.code(400).send({ error: 'No fields to update' });
      }

      params.push(id, userId);
      const query = `
        UPDATE goals 
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
        RETURNING id, title, target_amount_cents, current_amount_cents, target_date, notes
      `;

      const result = await db.query(query, params);

      const goal = result.rows[0];
      return reply.send({
        goal: {
          id: goal.id,
          name: goal.title,
          target: parseFloat(goal.target_amount_cents) / 100,
          current: parseFloat(goal.current_amount_cents) / 100,
          deadline: goal.target_date ? new Date(goal.target_date).toLocaleDateString('pt-BR') : null,
          category: goal.notes || 'Geral',
        },
      });
    } catch (error: any) {
      fastify.log.error('Error updating goal:', error);
      return reply.code(500).send({ error: 'Internal server error', details: error.message });
    }
  });

  // Delete goal
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { id } = request.params as any;

      // Check if goals table exists, create if it doesn't
      let hasGoals = false;
      try {
        await db.query('SELECT 1 FROM goals LIMIT 1');
        hasGoals = true;
      } catch {
        // Table doesn't exist, try to create it
        try {
          await db.query(`
            CREATE TABLE IF NOT EXISTS goals (
              id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              title              TEXT NOT NULL,
              target_amount_cents BIGINT NOT NULL,
              current_amount_cents BIGINT NOT NULL DEFAULT 0,
              currency           TEXT NOT NULL DEFAULT 'BRL',
              target_date        DATE,
              notes              TEXT,
              created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
              updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
            )
          `);
          await db.query('CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id)');
          hasGoals = true;
          fastify.log.info('Goals table created successfully');
        } catch (createError: any) {
          fastify.log.error('Error creating goals table:', createError);
          return reply.code(503).send({ 
            error: 'Service temporarily unavailable',
            message: 'Goal deletion is currently unavailable. Please try again later.'
          });
        }
      }

      const result = await db.query(
        'DELETE FROM goals WHERE id = $1 AND user_id = $2 RETURNING id',
        [id, userId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Goal not found' });
      }

      return reply.send({ message: 'Goal deleted successfully' });
    } catch (error: any) {
      fastify.log.error('Error deleting goal:', error);
      return reply.code(500).send({ error: 'Internal server error', details: error.message });
    }
  });
}

