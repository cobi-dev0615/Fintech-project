import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { db } from '../db/connection.js';

const registerSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['customer', 'consultant', 'admin']).default('customer'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(fastify: FastifyInstance) {
  // Register
  fastify.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = registerSchema.parse(request.body);
      
      // Check if user exists
      const existingUser = await db.query(
        'SELECT id FROM users WHERE email = $1',
        [body.email]
      );
      
      if (existingUser.rows.length > 0) {
        return reply.code(400).send({ error: 'Email already registered' });
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(body.password, 10);
      
      // Create user
      const result = await db.query(
        `INSERT INTO users (full_name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, full_name, email, role, created_at`,
        [body.full_name, body.email, passwordHash, body.role]
      );
      
      const user = result.rows[0];
      
      // Generate JWT
      const token = fastify.jwt.sign({ userId: user.id, role: user.role });
      
      return reply.code(201).send({
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
        },
        token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
  
  // Login
  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = loginSchema.parse(request.body);
      
      // Find user
      const result = await db.query(
        'SELECT id, full_name, email, password_hash, role, is_active FROM users WHERE email = $1',
        [body.email]
      );
      
      if (result.rows.length === 0) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }
      
      const user = result.rows[0];
      
      if (!user.is_active) {
        return reply.code(403).send({ error: 'Account is inactive' });
      }
      
      // Verify password
      if (!user.password_hash) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }
      
      const validPassword = await bcrypt.compare(body.password, user.password_hash);
      
      if (!validPassword) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }
      
      // Generate JWT
      const token = fastify.jwt.sign({ userId: user.id, role: user.role });
      
      return reply.send({
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
        },
        token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
  
  // Get current user
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      
      const result = await db.query(
        'SELECT id, full_name, email, role, created_at FROM users WHERE id = $1',
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
}

// Add authenticate decorator
declare module 'fastify' {
  interface FastifyInstance {
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
}

// Register authenticate decorator
export async function registerAuthDecorator(fastify: FastifyInstance) {
  fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });
}
