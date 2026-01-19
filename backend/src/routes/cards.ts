import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';

export async function cardsRoutes(fastify: FastifyInstance) {
  // Get all credit cards
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      
      // Check if credit_cards table exists
      let hasCreditCards = false;
      try {
        await db.query('SELECT 1 FROM credit_cards LIMIT 1');
        hasCreditCards = true;
      } catch {}

      if (!hasCreditCards) {
        return reply.send({ cards: [] });
      }

      // Check if institutions table exists (for the JOIN)
      let hasInstitutions = false;
      try {
        await db.query('SELECT 1 FROM institutions LIMIT 1');
        hasInstitutions = true;
      } catch {}

      let query = `
        SELECT 
          cc.id,
          cc.display_name,
          cc.brand,
          cc.last4,
          cc.limit_cents,
          cc.currency
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
         FROM credit_cards cc
      `;

      if (hasInstitutions) {
        query += `LEFT JOIN institutions i ON cc.institution_id = i.id`;
      }

      query += `
         WHERE cc.user_id = $1
         ORDER BY cc.created_at DESC
      `;
      
      const result = await db.query(query, [userId]);
      
      return reply.send({ cards: result.rows });
    } catch (error: any) {
      fastify.log.error('Error fetching credit cards:', error);
      // Return empty array instead of error to prevent frontend crashes
      return reply.send({ cards: [] });
    }
  });
  
  // Get card invoices
  fastify.get('/:cardId/invoices', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { cardId } = request.params as any;
      
      // Check if card_invoices table exists
      let hasCardInvoices = false;
      try {
        await db.query('SELECT 1 FROM card_invoices LIMIT 1');
        hasCardInvoices = true;
      } catch {}

      if (!hasCardInvoices) {
        return reply.send({ invoices: [] });
      }
      
      const result = await db.query(
        `SELECT 
          ci.id,
          ci.period_start,
          ci.period_end,
          ci.due_date,
          ci.total_cents,
          ci.minimum_cents,
          ci.status
         FROM card_invoices ci
         WHERE ci.user_id = $1 AND ci.card_id = $2
         ORDER BY ci.period_end DESC`,
        [userId, cardId]
      );
      
      return reply.send({ invoices: result.rows });
    } catch (error: any) {
      fastify.log.error('Error fetching card invoices:', error);
      // Return empty array instead of error to prevent frontend crashes
      return reply.send({ invoices: [] });
    }
  });

  // Create a new credit card
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const { 
        displayName, 
        brand, 
        last4, 
        limitCents, 
        institutionId, 
        connectionId,
        currency = 'BRL'
      } = request.body as any;

      // Validate required fields
      if (!displayName || !brand || !last4) {
        return reply.code(400).send({ 
          error: 'Missing required fields. displayName, brand, and last4 are required.' 
        });
      }

      // Validate last4 is 4 digits
      if (!/^\d{4}$/.test(last4)) {
        return reply.code(400).send({ 
          error: 'last4 must be exactly 4 digits' 
        });
      }

      // Check if credit_cards table exists
      let hasCreditCards = false;
      try {
        await db.query('SELECT 1 FROM credit_cards LIMIT 1');
        hasCreditCards = true;
      } catch {}

      if (!hasCreditCards) {
        return reply.code(500).send({ error: 'Credit cards table not found' });
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

      // Validate connection_id if provided
      if (connectionId) {
        let hasConnections = false;
        try {
          await db.query('SELECT 1 FROM connections LIMIT 1');
          hasConnections = true;
        } catch {}

        if (hasConnections) {
          const connResult = await db.query(
            'SELECT id FROM connections WHERE id = $1 AND user_id = $2', 
            [connectionId, userId]
          );
          if (connResult.rows.length === 0) {
            return reply.code(400).send({ error: 'Connection not found or does not belong to user' });
          }
        }
      }

      // Create the credit card
      const result = await db.query(
        `INSERT INTO credit_cards (
          user_id, 
          display_name, 
          brand, 
          last4, 
          limit_cents, 
          currency,
          institution_id,
          connection_id
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, display_name, brand, last4, limit_cents, currency, institution_id, connection_id, created_at`,
        [
          userId, 
          displayName, 
          brand, 
          last4, 
          limitCents ? BigInt(limitCents) : null, 
          currency,
          institutionId || null,
          connectionId || null
        ]
      );

      const card = result.rows[0];

      // Get institution name if available
      if (card.institution_id) {
        let hasInstitutions = false;
        try {
          await db.query('SELECT 1 FROM institutions LIMIT 1');
          hasInstitutions = true;
        } catch {}

        if (hasInstitutions) {
          const instResult = await db.query(
            'SELECT name, logo_url FROM institutions WHERE id = $1',
            [card.institution_id]
          );
          if (instResult.rows.length > 0) {
            card.institution_name = instResult.rows[0].name;
            card.institution_logo = instResult.rows[0].logo_url;
          }
        }
      }

      return reply.code(201).send({ card });
    } catch (error: any) {
      fastify.log.error('Error creating credit card:', error);
      return reply.code(500).send({ error: 'Internal server error', details: error.message });
    }
  });
}
