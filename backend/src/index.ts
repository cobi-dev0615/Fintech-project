import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import dotenv from 'dotenv';
import { db } from './db/connection.js';
import { authRoutes } from './routes/auth.js';
import { usersRoutes } from './routes/users.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { connectionsRoutes } from './routes/connections.js';
import { accountsRoutes } from './routes/accounts.js';
import { cardsRoutes } from './routes/cards.js';
import { investmentsRoutes } from './routes/investments.js';

dotenv.config();

const fastify = Fastify({
  logger: true,
});

// Register plugins
await fastify.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
});

await fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
});

// Add authenticate decorator
fastify.decorate('authenticate', async function (request: any, reply: any) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.send(err);
  }
});

// Health check
fastify.get('/health', async () => {
  try {
    await db.query('SELECT 1');
    return { status: 'ok', database: 'connected' };
  } catch (error) {
    return { status: 'error', database: 'disconnected' };
  }
});

// Register routes
await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(usersRoutes, { prefix: '/api/users' });
await fastify.register(dashboardRoutes, { prefix: '/api/dashboard' });
await fastify.register(connectionsRoutes, { prefix: '/api/connections' });
await fastify.register(accountsRoutes, { prefix: '/api/accounts' });
await fastify.register(cardsRoutes, { prefix: '/api/cards' });
await fastify.register(investmentsRoutes, { prefix: '/api/investments' });

// Start server
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3000;
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    console.log(`🚀 Server running on http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
