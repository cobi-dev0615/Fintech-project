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
import { financeRoutes } from './routes/finance.js';
import { cardsRoutes } from './routes/cards.js';
import { investmentsRoutes } from './routes/investments.js';
import { adminRoutes } from './routes/admin.js';
import { consultantRoutes } from './routes/consultant.js';
import { customerRoutes } from './routes/customer.js';
import { reportsRoutes } from './routes/reports.js';
import { goalsRoutes } from './routes/goals.js';
import { notificationsRoutes } from './routes/notifications.js';
import { plansRoutes } from './routes/plans.js';
import { publicRoutes } from './routes/public.js';
import { subscriptionsRoutes } from './routes/subscriptions.js';
import { commentsRoutes } from './routes/comments.js';
import { mercadopagoRoutes } from './routes/mercadopago.js';
import { messageFileRoutes } from './routes/message-files.js';
import { setupWebSocket } from './websocket/websocket.js';

dotenv.config();

const fastify = Fastify({
  logger: true,
});

// Register plugins
await fastify.register(cors, {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }
    
    // Get allowed origins from environment or use defaults
    const allowedOrigins = process.env.FRONTEND_URL 
      ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
      : [
          'http://localhost:8080',
          'http://localhost:8081',
          'http://127.0.0.1:8080',
          'http://127.0.0.1:8081',
          'http://167.71.94.65',
          'http://167.71.94.65:80',
          'http://167.71.94.65:8080',
          'http://167.71.94.65:8081',
        ];
    
    // Normalize origin (remove trailing slash if present)
    const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
    
    // Check if origin is allowed (exact match)
    if (allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
      return;
    }
    
    // Also check if origin starts with allowed IP (for any port)
    try {
      const originUrl = new URL(normalizedOrigin);
      const originHostname = originUrl.hostname;
      
      // Check if the hostname matches any of our allowed IPs or domains
      const allowedHostnames = [
        'localhost',
        '127.0.0.1',
        '167.71.94.65',
        'www.zurt.com.br',
        'zurt.com.br',
      ];
      
      if (allowedHostnames.includes(originHostname)) {
        callback(null, true);
        return;
      }
    } catch (e) {
      // URL parsing failed, deny
    }
    
    // Deny by default
    fastify.log.warn({ origin: normalizedOrigin, allowedOrigins }, 'CORS request blocked');
    callback(new Error('Not allowed by CORS'), false);
  },
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
await fastify.register(financeRoutes, { prefix: '/api/finance' });
await fastify.register(cardsRoutes, { prefix: '/api/cards' });
await fastify.register(investmentsRoutes, { prefix: '/api/investments' });
await fastify.register(adminRoutes, { prefix: '/api/admin' });
await fastify.register(consultantRoutes, { prefix: '/api/consultant' });
await fastify.register(customerRoutes, { prefix: '/api/customer' });
await fastify.register(reportsRoutes, { prefix: '/api/reports' });
await fastify.register(goalsRoutes, { prefix: '/api/goals' });
await fastify.register(notificationsRoutes, { prefix: '/api/notifications' });
await fastify.register(plansRoutes, { prefix: '/api/plans' });
await fastify.register(publicRoutes, { prefix: '/api/public' });
await fastify.register(subscriptionsRoutes, { prefix: '/api/subscriptions' });
await fastify.register(commentsRoutes, { prefix: '/api/comments' });
await fastify.register(mercadopagoRoutes, { prefix: '/api/mercadopago' });
await fastify.register(messageFileRoutes, { prefix: '/api/messages' });

// Start server
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 5000;
    const host = process.env.HOST || '0.0.0.0';
    
    // Setup WebSocket before listening (needs the server instance)
    setupWebSocket(fastify);
    
    // Start listening
    await fastify.listen({ port, host });
    
    console.log(`🚀 Server running on http://${host}:${port}`);
    console.log(`📡 WebSocket available on ws://${host}:${port}/ws`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
