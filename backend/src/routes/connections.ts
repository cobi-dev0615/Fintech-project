import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';

export async function connectionsRoutes(fastify: FastifyInstance) {
  // Get all connections
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      
      // Check if connections table exists
      let hasConnections = false;
      try {
        await db.query('SELECT 1 FROM connections LIMIT 1');
        hasConnections = true;
      } catch {}

      if (!hasConnections) {
        return reply.send({ connections: [] });
      }

      // Check if institutions table exists (for the JOIN)
      let hasInstitutions = false;
      try {
        await db.query('SELECT 1 FROM institutions LIMIT 1');
        hasInstitutions = true;
      } catch {}

      let query = `
        SELECT 
          c.id,
          c.provider,
          c.status,
          c.last_sync_at,
          c.last_sync_status
      `;

      if (hasInstitutions) {
        query += `,
          i.name as institution_name,
          i.logo_url as institution_logo`;
      } else {
        query += `,
          NULL as institution_name,
          NULL as institution_logo`;
      }

      query += `
         FROM connections c
      `;

      if (hasInstitutions) {
        query += `LEFT JOIN institutions i ON c.institution_id = i.id`;
      }

      query += `
         WHERE c.user_id = $1
         ORDER BY c.created_at DESC
      `;
      
      const result = await db.query(query, [userId]);
      
      return reply.send({ connections: result.rows });
    } catch (error) {
      fastify.log.error(error);
      // Return empty array instead of error to prevent frontend crashes
      return reply.send({ connections: [] });
    }
  });
  
  // Get available institutions
  fastify.get('/institutions', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { provider } = request.query as any;
      
      // Check if institutions table exists
      let hasInstitutions = false;
      try {
        await db.query('SELECT 1 FROM institutions LIMIT 1');
        hasInstitutions = true;
      } catch {}

      if (!hasInstitutions) {
        return reply.send({ institutions: [] });
      }
      
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
      // Return empty array instead of error to prevent frontend crashes
      return reply.send({ institutions: [] });
    }
  });

  // Create a new connection
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { provider, institutionId } = request.body as any;

      if (!provider || !['open_finance', 'b3'].includes(provider)) {
        return reply.code(400).send({ error: 'Invalid provider. Must be "open_finance" or "b3"' });
      }

      // Check if connections table exists
      let hasConnections = false;
      try {
        await db.query('SELECT 1 FROM connections LIMIT 1');
        hasConnections = true;
      } catch {}

      if (!hasConnections) {
        return reply.code(500).send({ error: 'Connections table not found' });
      }

      // Validate institution_id if provided
      if (institutionId) {
        let hasInstitutions = false;
        try {
          await db.query('SELECT 1 FROM institutions LIMIT 1');
          hasInstitutions = true;
        } catch {}

        if (hasInstitutions) {
          const instResult = await db.query('SELECT id FROM institutions WHERE id = $1', [institutionId]);
          if (instResult.rows.length === 0) {
            return reply.code(400).send({ error: 'Institution not found' });
          }
        }
      }

      // Create the connection
      const result = await db.query(
        `INSERT INTO connections (user_id, provider, institution_id, status)
         VALUES ($1, $2, $3, 'pending')
         RETURNING id, provider, status, institution_id, created_at`,
        [userId, provider, institutionId || null]
      );

      const connection = result.rows[0];

      // Get institution name if available
      if (connection.institution_id) {
        let hasInstitutions = false;
        try {
          await db.query('SELECT 1 FROM institutions LIMIT 1');
          hasInstitutions = true;
        } catch {}

        if (hasInstitutions) {
          const instResult = await db.query(
            'SELECT name, logo_url FROM institutions WHERE id = $1',
            [connection.institution_id]
          );
          if (instResult.rows.length > 0) {
            connection.institution_name = instResult.rows[0].name;
            connection.institution_logo = instResult.rows[0].logo_url;
          }
        }
      }

      return reply.code(201).send({ connection });
    } catch (error: any) {
      fastify.log.error('Error creating connection:', error);
      return reply.code(500).send({ error: 'Internal server error', details: error.message });
    }
  });

  // Delete a connection
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { id } = request.params as any;

      // Check if connections table exists
      let hasConnections = false;
      try {
        await db.query('SELECT 1 FROM connections LIMIT 1');
        hasConnections = true;
      } catch {}

      if (!hasConnections) {
        return reply.code(404).send({ error: 'Connection not found' });
      }

      // Verify connection belongs to user
      const verifyResult = await db.query(
        'SELECT id FROM connections WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (verifyResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Connection not found' });
      }

      // Delete the connection
      await db.query('DELETE FROM connections WHERE id = $1 AND user_id = $2', [id, userId]);

      return reply.send({ success: true, message: 'Connection deleted successfully' });
    } catch (error: any) {
      fastify.log.error('Error deleting connection:', error);
      return reply.code(500).send({ error: 'Internal server error', details: error.message });
    }
  });
}
