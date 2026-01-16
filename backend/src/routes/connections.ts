import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';

export async function connectionsRoutes(fastify: FastifyInstance) {
  // Get all connections
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      
      const result = await db.query(
        `SELECT 
          c.id,
          c.provider,
          c.status,
          c.last_sync_at,
          c.last_sync_status,
          i.name as institution_name,
          i.logo_url as institution_logo
         FROM connections c
         LEFT JOIN institutions i ON c.institution_id = i.id
         WHERE c.user_id = $1
         ORDER BY c.created_at DESC`,
        [userId]
      );
      
      return reply.send({ connections: result.rows });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
  
  // Get available institutions
  fastify.get('/institutions', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { provider } = request.query as any;
      
      let query = 'SELECT id, provider, name, logo_url FROM institutions WHERE 1=1';
      const params: any[] = [];
      
      if (provider) {
        query += ' AND provider = $1';
        params.push(provider);
      }
      
      query += ' ORDER BY name ASC';
      
      const result = await db.query(query, params);
      
      return reply.send({ institutions: result.rows });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
