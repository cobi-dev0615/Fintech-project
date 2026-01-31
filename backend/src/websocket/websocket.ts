import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';
import { cache } from '../utils/cache.js';

interface UserWebSocket extends WebSocket {
  isAlive?: boolean;
  userId?: string;
  role?: string;
}

export function setupWebSocket(fastify: FastifyInstance) {
  // Wait for server to be ready
  Promise.resolve(fastify.ready()).then(() => {
    const httpServer = fastify.server as HttpServer;
    
    if (!httpServer) {
      fastify.log.warn('HTTP server not available for WebSocket');
      return;
    }
    
    const wss = new WebSocketServer({ 
      server: httpServer,
      path: '/ws',
    });

  // Broadcast to all connected admin clients
  function broadcastToAdmins(data: any) {
    wss.clients.forEach((client: UserWebSocket) => {
      if (client.role === 'admin' && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }

  // Broadcast to a specific user by userId
  function broadcastToUser(userId: string, data: any) {
    wss.clients.forEach((client: UserWebSocket) => {
      if (client.userId === userId && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }

  // Broadcast to all connected clients
  function broadcastToAll(data: any) {
    wss.clients.forEach((client: UserWebSocket) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }

    // Ping clients to check if they're still connected
    setInterval(() => {
      wss.clients.forEach((ws: UserWebSocket) => {
        if (!ws.isAlive) {
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    wss.on('connection', async (ws: UserWebSocket, request) => {
      ws.isAlive = true;
      console.log('WebSocket connection attempt from:', request.socket.remoteAddress);

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Authenticate WebSocket connection with JWT
      const url = new URL(request.url || '', 'http://localhost');
      const token = url.searchParams.get('token');

      if (!token) {
        console.log('WebSocket connection rejected: No token provided');
        ws.close(1008, 'Authentication required');
        return;
      }

      // Verify JWT and extract user info
      let decodedUserId: string | null = null;
      let decodedRole: string | null = null;
      try {
        const decoded = await (fastify as any).jwt.verify(token);
        decodedUserId = (decoded as any).userId ?? (decoded as any).id;
        decodedRole = (decoded as any).role;
      } catch (err) {
        console.log('WebSocket connection rejected: Invalid token');
        ws.close(1008, 'Invalid token');
        return;
      }

      // Set user identity from verified JWT
      if (decodedUserId) {
        ws.userId = decodedUserId;
        ws.role = decodedRole || 'customer';
        console.log('WebSocket authenticated for user', decodedUserId, 'role', ws.role);
      }

      ws.on('message', async (message: string) => {
        try {
          const data = JSON.parse(message.toString());

          if (data.type === 'authenticate' && data.userId && data.role) {
            // Trust JWT over client-sent data; update only if JWT didn't have it
            if (!ws.userId) {
              ws.userId = data.userId;
              ws.role = data.role;
            }
            const roleMessage = ws.role === 'admin'
              ? 'Connected to admin updates'
              : `Connected as ${ws.role}`;
            ws.send(JSON.stringify({ type: 'authenticated', message: roleMessage }));
          } else if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        // Cleanup on disconnect
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });

    // Poll database for changes and broadcast to admins
    let lastMetricsUpdate = Date.now();
    
    setInterval(async () => {
      // Check for new alerts
      try {
        const alertsResult = await db.query(
          `SELECT COUNT(*) as count FROM system_alerts 
           WHERE resolved = false 
           AND created_at > NOW() - INTERVAL '1 minute'`
        );
        
        if (parseInt(alertsResult.rows[0].count) > 0) {
          // Invalidate cache and broadcast
          cache.delete('admin:dashboard:metrics');
          broadcastToAdmins({
            type: 'metrics_updated',
            message: 'Dashboard metrics updated',
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        // Table might not exist yet
      }

      // Broadcast metrics update every 60 seconds if cache is stale
      const now = Date.now();
      if (now - lastMetricsUpdate > 60000) {
        lastMetricsUpdate = now;
        cache.delete('admin:dashboard:metrics');
        broadcastToAdmins({
          type: 'metrics_refresh',
          message: 'Metrics refreshed',
          timestamp: new Date().toISOString(),
        });
      }
    }, 10000); // Check every 10 seconds

    // Expose broadcast functions for use in routes
    (fastify as any).websocket = {
      broadcastToAdmins,
      broadcastToUser,
      broadcastToAll,
    };

    fastify.log.info('WebSocket server started on /ws');
  }).catch((error) => {
    fastify.log.error('Failed to setup WebSocket:', error);
  });
}

