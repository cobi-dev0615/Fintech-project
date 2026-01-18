import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';
import { cache } from '../utils/cache.js';

export async function consultantRoutes(fastify: FastifyInstance) {
  // Middleware: Only consultants can access these routes
  const requireConsultant = async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
      if ((request.user as any).role !== 'consultant') {
        reply.code(403).send({ error: 'Access denied. Consultant role required.' });
      }
    } catch (err) {
      reply.send(err);
    }
  };

  // Helper to get consultant ID from request
  const getConsultantId = (request: any): string => {
    return (request.user as any).userId;
  };

  // Dashboard Metrics
  fastify.get('/dashboard/metrics', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const cacheKey = `consultant:${consultantId}:dashboard:metrics`;
      
      // Try cache first
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // Get total clients
      const clientsResult = await db.query(
        `SELECT COUNT(*) as count 
         FROM customer_consultants 
         WHERE consultant_id = $1 AND status = 'active'`,
        [consultantId]
      );
      const totalClients = parseInt(clientsResult.rows[0].count);

      // Get new clients this month
      const newClientsResult = await db.query(
        `SELECT COUNT(*) as count 
         FROM customer_consultants 
         WHERE consultant_id = $1 
         AND status = 'active'
         AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
        [consultantId]
      );
      const newClients = parseInt(newClientsResult.rows[0].count);

      // Calculate total net worth under management
      const netWorthResult = await db.query(
        `SELECT COALESCE(SUM(
          (SELECT COALESCE(SUM(balance_cents), 0) FROM bank_accounts WHERE user_id = cc.customer_id) +
          (SELECT COALESCE(SUM(market_value_cents), 0) FROM holdings WHERE user_id = cc.customer_id)
        ), 0) / 100.0 as total_net_worth
         FROM customer_consultants cc
         WHERE cc.consultant_id = $1 AND cc.status = 'active'`,
        [consultantId]
      );
      const totalNetWorth = parseFloat(netWorthResult.rows[0].total_net_worth) || 0;

      // Get pending tasks
      const tasksResult = await db.query(
        `SELECT COUNT(*) as count 
         FROM tasks 
         WHERE consultant_id = $1 
         AND is_done = FALSE 
         AND (due_at IS NULL OR due_at <= NOW() + INTERVAL '1 day')`,
        [consultantId]
      );
      const pendingTasks = parseInt(tasksResult.rows[0].count);

      // Get prospects count (CRM leads)
      const prospectsResult = await db.query(
        `SELECT COUNT(*) as count 
         FROM crm_leads 
         WHERE consultant_id = $1 
         AND stage NOT IN ('won', 'lost')`,
        [consultantId]
      );
      const prospects = parseInt(prospectsResult.rows[0].count);

      // Get pipeline data by stage
      const pipelineResult = await db.query(
        `SELECT stage, COUNT(*) as count
         FROM crm_leads
         WHERE consultant_id = $1
         GROUP BY stage
         ORDER BY 
           CASE stage
             WHEN 'lead' THEN 1
             WHEN 'contacted' THEN 2
             WHEN 'meeting' THEN 3
             WHEN 'proposal' THEN 4
             WHEN 'won' THEN 5
             WHEN 'lost' THEN 6
           END`,
        [consultantId]
      );

      const pipelineData = pipelineResult.rows.map(row => ({
        stage: row.stage,
        count: parseInt(row.count),
      }));

      // Get recent tasks
      const recentTasksResult = await db.query(
        `SELECT 
           t.id,
           t.title,
           t.due_at,
           u.full_name as client_name,
           t.is_done
         FROM tasks t
         LEFT JOIN users u ON t.customer_id = u.id
         WHERE t.consultant_id = $1
         AND t.is_done = FALSE
         ORDER BY t.due_at ASC NULLS LAST, t.created_at DESC
         LIMIT 5`,
        [consultantId]
      );

      const recentTasks = recentTasksResult.rows.map(row => ({
        id: row.id,
        task: row.title,
        client: row.client_name || 'Sem cliente',
        dueDate: row.due_at 
          ? new Date(row.due_at).toLocaleDateString('pt-BR')
          : 'Sem data',
        priority: row.due_at && new Date(row.due_at) <= new Date() ? 'high' : 'medium',
      }));

      const data = {
        kpis: {
          totalClients,
          newClients,
          totalNetWorth,
          pendingTasks,
          prospects,
        },
        pipeline: pipelineData,
        recentTasks,
      };

      // Cache for 1 minute
      cache.set(cacheKey, data, 60);
      return data;
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get Clients List
  fastify.get('/clients', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const { search, status, page = 1, limit = 20 } = request.query as any;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let query = `
        SELECT 
          u.id,
          u.full_name as name,
          u.email,
          u.is_active,
          cc.status as relationship_status,
          cc.created_at as relationship_created_at,
          COALESCE(
            (SELECT SUM(balance_cents) FROM bank_accounts WHERE user_id = u.id) +
            (SELECT SUM(market_value_cents) FROM holdings WHERE user_id = u.id),
            0
          ) / 100.0 as net_worth,
          (SELECT MAX(created_at) FROM client_notes WHERE customer_id = u.id AND consultant_id = $1) as last_contact
        FROM customer_consultants cc
        JOIN users u ON cc.customer_id = u.id
        WHERE cc.consultant_id = $1
      `;
      const params: any[] = [consultantId];
      let paramIndex = 2;

      if (search) {
        query += ` AND (u.full_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (status) {
        query += ` AND cc.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      // Get total count
      const countQuery = query.replace(
        /SELECT[\s\S]*?FROM/,
        'SELECT COUNT(*) as count FROM'
      );
      const countResult = await db.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      query += ` ORDER BY cc.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(parseInt(limit), offset);

      const result = await db.query(query, params);

      const clients = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        email: row.email,
        netWorth: parseFloat(row.net_worth) || 0,
        status: row.relationship_status === 'active' ? 'active' : 
                row.relationship_status === 'paused' ? 'inactive' : 'pending',
        lastContact: row.last_contact 
          ? new Date(row.last_contact).toLocaleDateString('pt-BR')
          : 'Nunca',
      }));

      return {
        clients,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get Client Profile
  fastify.get('/clients/:id', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const { id } = request.params as any;

      // Verify consultant has access to this client
      const accessCheck = await db.query(
        `SELECT 1 FROM customer_consultants 
         WHERE consultant_id = $1 AND customer_id = $2`,
        [consultantId, id]
      );

      if (accessCheck.rows.length === 0) {
        return reply.code(403).send({ error: 'Access denied to this client' });
      }

      // Get client basic info
      const clientResult = await db.query(
        `SELECT id, full_name, email, phone, birth_date, risk_profile, created_at
         FROM users WHERE id = $1`,
        [id]
      );

      if (clientResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Client not found' });
      }

      const client = clientResult.rows[0];

      // Get financial summary
      const cashResult = await db.query(
        `SELECT COALESCE(SUM(balance_cents), 0) / 100.0 as cash
         FROM bank_accounts WHERE user_id = $1`,
        [id]
      );
      const cash = parseFloat(cashResult.rows[0].cash) || 0;

      const investmentsResult = await db.query(
        `SELECT COALESCE(SUM(market_value_cents), 0) / 100.0 as investments
         FROM holdings WHERE user_id = $1`,
        [id]
      );
      const investments = parseFloat(investmentsResult.rows[0].investments) || 0;

      // Get debt (from credit card invoices)
      const debtResult = await db.query(
        `SELECT COALESCE(SUM(total_cents), 0) / 100.0 as debt
         FROM card_invoices 
         WHERE user_id = $1 AND status = 'open'`,
        [id]
      );
      const debt = parseFloat(debtResult.rows[0].debt) || 0;

      const netWorth = cash + investments - debt;

      // Get client notes
      const notesResult = await db.query(
        `SELECT id, note, created_at
         FROM client_notes
         WHERE consultant_id = $1 AND customer_id = $2
         ORDER BY created_at DESC`,
        [consultantId, id]
      );

      const notes = notesResult.rows.map(row => ({
        id: row.id,
        content: row.note,
        date: new Date(row.created_at).toLocaleDateString('pt-BR'),
      }));

      // Get generated reports
      const reportsResult = await db.query(
        `SELECT id, type, created_at, file_url
         FROM reports
         WHERE owner_user_id = $1 AND target_user_id = $2
         ORDER BY created_at DESC`,
        [consultantId, id]
      );

      const reports = reportsResult.rows.map(row => ({
        id: row.id,
        type: row.type,
        generatedAt: new Date(row.created_at).toLocaleDateString('pt-BR'),
        downloadUrl: row.file_url,
      }));

      return {
        client: {
          id: client.id,
          name: client.full_name,
          email: client.email,
          phone: client.phone,
          birthDate: client.birth_date,
          riskProfile: client.risk_profile,
          createdAt: client.created_at,
        },
        financial: {
          netWorth,
          cash,
          investments,
          debt,
        },
        notes,
        reports,
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Add Client Note
  fastify.post('/clients/:id/notes', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const { id } = request.params as any;
      const { note } = request.body as any;

      if (!note || !note.trim()) {
        return reply.code(400).send({ error: 'Note is required' });
      }

      // Verify access
      const accessCheck = await db.query(
        `SELECT 1 FROM customer_consultants 
         WHERE consultant_id = $1 AND customer_id = $2`,
        [consultantId, id]
      );

      if (accessCheck.rows.length === 0) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      const result = await db.query(
        `INSERT INTO client_notes (consultant_id, customer_id, note)
         VALUES ($1, $2, $3)
         RETURNING id, note, created_at`,
        [consultantId, id, note.trim()]
      );

      // Clear cache
      cache.del(`consultant:${consultantId}:dashboard:metrics`);

      return {
        note: {
          id: result.rows[0].id,
          content: result.rows[0].note,
          date: new Date(result.rows[0].created_at).toLocaleDateString('pt-BR'),
        },
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get Pipeline (CRM Leads)
  fastify.get('/pipeline', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);

      const result = await db.query(
        `SELECT 
           id,
           full_name as name,
           email,
           phone,
           stage,
           notes,
           created_at
         FROM crm_leads
         WHERE consultant_id = $1
         ORDER BY 
           CASE stage
             WHEN 'lead' THEN 1
             WHEN 'contacted' THEN 2
             WHEN 'meeting' THEN 3
             WHEN 'proposal' THEN 4
             WHEN 'won' THEN 5
             WHEN 'lost' THEN 6
           END,
           created_at DESC`,
        [consultantId]
      );

      const prospects = result.rows.map(row => ({
        id: row.id,
        name: row.name || 'Sem nome',
        email: row.email || '',
        phone: row.phone || '',
        stage: row.stage,
        notes: row.notes || '',
        createdAt: row.created_at,
      }));

      return { prospects };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Create/Update Prospect
  fastify.post('/pipeline/prospects', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const { id, name, email, phone, stage, notes } = request.body as any;

      if (id) {
        // Update existing
        const result = await db.query(
          `UPDATE crm_leads
           SET full_name = $1, email = $2, phone = $3, stage = $4, notes = $5, updated_at = NOW()
           WHERE id = $6 AND consultant_id = $7
           RETURNING id, full_name, email, phone, stage, notes`,
          [name, email, phone, stage || 'lead', notes, id, consultantId]
        );

        if (result.rows.length === 0) {
          return reply.code(404).send({ error: 'Prospect not found' });
        }

        return { prospect: result.rows[0] };
      } else {
        // Create new
        if (!email) {
          return reply.code(400).send({ error: 'Email is required' });
        }

        const result = await db.query(
          `INSERT INTO crm_leads (consultant_id, full_name, email, phone, stage, notes)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, full_name, email, phone, stage, notes, created_at`,
          [consultantId, name, email, phone, stage || 'lead', notes]
        );

        // Clear cache
        cache.del(`consultant:${consultantId}:dashboard:metrics`);

        return { prospect: result.rows[0] };
      }
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update Prospect Stage
  fastify.patch('/pipeline/prospects/:id/stage', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const { id } = request.params as any;
      const { stage } = request.body as any;

      if (!stage) {
        return reply.code(400).send({ error: 'Stage is required' });
      }

      const result = await db.query(
        `UPDATE crm_leads
         SET stage = $1, updated_at = NOW()
         WHERE id = $2 AND consultant_id = $3
         RETURNING id, stage`,
        [stage, id, consultantId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Prospect not found' });
      }

      // Clear cache
      cache.del(`consultant:${consultantId}:dashboard:metrics`);

      return { prospect: result.rows[0] };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Delete Prospect
  fastify.delete('/pipeline/prospects/:id', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const { id } = request.params as any;

      const result = await db.query(
        `DELETE FROM crm_leads
         WHERE id = $1 AND consultant_id = $2
         RETURNING id`,
        [id, consultantId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Prospect not found' });
      }

      // Clear cache
      cache.del(`consultant:${consultantId}:dashboard:metrics`);

      return { message: 'Prospect deleted' };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get Invitations
  fastify.get('/invitations', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);

      // For now, we'll use a simple approach - store invitations in a JSONB column
      // or create a separate invitations table. Let's check if we have one.
      // Since we don't have an invitations table yet, we'll return empty for now
      // and create the table in a migration

      // For MVP, we can use customer_consultants with status='pending' as invitations
      const result = await db.query(
        `SELECT 
           cc.id,
           cc.customer_id,
           u.email,
           u.full_name as name,
           cc.status,
           cc.created_at as sent_at,
           cc.created_at + INTERVAL '30 days' as expires_at
         FROM customer_consultants cc
         LEFT JOIN users u ON cc.customer_id = u.id
         WHERE cc.consultant_id = $1
         ORDER BY cc.created_at DESC`,
        [consultantId]
      );

      const invitations = result.rows.map(row => ({
        id: row.id,
        email: row.email || 'N/A',
        name: row.name || null,
        status: row.status === 'active' ? 'accepted' : 
                row.status === 'pending' ? 'pending' : 'expired',
        sentAt: new Date(row.sent_at).toISOString().split('T')[0],
        expiresAt: row.expires_at ? new Date(row.expires_at).toISOString().split('T')[0] : null,
      }));

      return { invitations };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Send Invitation
  fastify.post('/invitations', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const { email, name, message } = request.body as any;

      if (!email) {
        return reply.code(400).send({ error: 'Email is required' });
      }

      // Check if user exists
      const userResult = await db.query(
        `SELECT id, role FROM users WHERE email = $1`,
        [email]
      );

      let customerId: string;

      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        if (user.role !== 'customer') {
          return reply.code(400).send({ error: 'User is not a customer' });
        }
        customerId = user.id;

        // Check if relationship already exists
        const existingResult = await db.query(
          `SELECT id FROM customer_consultants 
           WHERE consultant_id = $1 AND customer_id = $2`,
          [consultantId, customerId]
        );

        if (existingResult.rows.length > 0) {
          return reply.code(400).send({ error: 'Invitation already sent or relationship exists' });
        }
      } else {
        // Create a placeholder user or just store the invitation
        // For now, we'll require the user to exist
        return reply.code(400).send({ error: 'User with this email does not exist. They must register first.' });
      }

      // Create the relationship with pending status
      const result = await db.query(
        `INSERT INTO customer_consultants (consultant_id, customer_id, status)
         VALUES ($1, $2, 'pending')
         RETURNING id, created_at`,
        [consultantId, customerId]
      );

      // TODO: Send email invitation here

      return {
        invitation: {
          id: result.rows[0].id,
          email,
          name,
          status: 'pending',
          sentAt: new Date(result.rows[0].created_at).toISOString().split('T')[0],
        },
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get Conversations
  fastify.get('/messages/conversations', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);

      const result = await db.query(
        `SELECT 
           c.id,
           c.customer_id,
           u.full_name as client_name,
           u.email as client_email,
           (SELECT body FROM messages 
            WHERE conversation_id = c.id 
            ORDER BY created_at DESC LIMIT 1) as last_message,
           (SELECT created_at FROM messages 
            WHERE conversation_id = c.id 
            ORDER BY created_at DESC LIMIT 1) as last_message_time,
           (SELECT COUNT(*) FROM messages 
            WHERE conversation_id = c.id 
            AND sender_id != $1 
            AND is_read = FALSE) as unread_count,
           c.updated_at
         FROM conversations c
         JOIN users u ON c.customer_id = u.id
         WHERE c.consultant_id = $1
         ORDER BY c.updated_at DESC`,
        [consultantId]
      );

      const conversations = result.rows.map(row => ({
        id: row.id,
        clientId: row.customer_id,
        clientName: row.client_name,
        lastMessage: row.last_message || 'Nenhuma mensagem',
        timestamp: row.last_message_time 
          ? new Date(row.last_message_time).toLocaleString('pt-BR')
          : 'Nunca',
        unread: parseInt(row.unread_count) || 0,
      }));

      return { conversations };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get Messages for a Conversation
  fastify.get('/messages/conversations/:id', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const { id } = request.params as any;

      // Verify access
      const accessCheck = await db.query(
        `SELECT 1 FROM conversations 
         WHERE id = $1 AND consultant_id = $2`,
        [id, consultantId]
      );

      if (accessCheck.rows.length === 0) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      // Get conversation info
      const convResult = await db.query(
        `SELECT c.id, c.customer_id, u.full_name as client_name
         FROM conversations c
         JOIN users u ON c.customer_id = u.id
         WHERE c.id = $1`,
        [id]
      );

      if (convResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Conversation not found' });
      }

      // Get messages
      const messagesResult = await db.query(
        `SELECT 
           m.id,
           m.sender_id,
           m.body as content,
           m.created_at as timestamp,
           u.role
         FROM messages m
         JOIN users u ON m.sender_id = u.id
         WHERE m.conversation_id = $1
         ORDER BY m.created_at ASC`,
        [id]
      );

      // Mark messages as read
      await db.query(
        `UPDATE messages 
         SET is_read = TRUE 
         WHERE conversation_id = $1 AND sender_id != $2 AND is_read = FALSE`,
        [id, consultantId]
      );

      const messages = messagesResult.rows.map(row => ({
        id: row.id,
        sender: row.role === 'consultant' ? 'consultant' : 'client',
        content: row.content,
        timestamp: new Date(row.timestamp).toLocaleString('pt-BR'),
      }));

      return {
        conversation: {
          id: convResult.rows[0].id,
          clientId: convResult.rows[0].customer_id,
          clientName: convResult.rows[0].client_name,
        },
        messages,
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Send Message
  fastify.post('/messages/conversations/:id/messages', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const { id } = request.params as any;
      const { body } = request.body as any;

      if (!body || !body.trim()) {
        return reply.code(400).send({ error: 'Message body is required' });
      }

      // Verify access
      const accessCheck = await db.query(
        `SELECT 1 FROM conversations 
         WHERE id = $1 AND consultant_id = $2`,
        [id, consultantId]
      );

      if (accessCheck.rows.length === 0) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      // Create message
      const result = await db.query(
        `INSERT INTO messages (conversation_id, sender_id, body)
         VALUES ($1, $2, $3)
         RETURNING id, body, created_at`,
        [id, consultantId, body.trim()]
      );

      // Update conversation updated_at
      await db.query(
        `UPDATE conversations SET updated_at = NOW() WHERE id = $1`,
        [id]
      );

      return {
        message: {
          id: result.rows[0].id,
          sender: 'consultant',
          content: result.rows[0].body,
          timestamp: new Date(result.rows[0].created_at).toLocaleString('pt-BR'),
        },
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get Reports
  fastify.get('/reports', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const { clientId } = request.query as any;

      let query = `
        SELECT 
          r.id,
          r.type,
          r.target_user_id as client_id,
          u.full_name as client_name,
          r.created_at as generated_at,
          r.file_url,
          r.params_json
        FROM reports r
        LEFT JOIN users u ON r.target_user_id = u.id
        WHERE r.owner_user_id = $1
      `;
      const params: any[] = [consultantId];

      if (clientId) {
        query += ` AND r.target_user_id = $2`;
        params.push(clientId);
      }

      query += ` ORDER BY r.created_at DESC`;

      const result = await db.query(query, params);

      const reports = result.rows.map(row => ({
        id: row.id,
        clientName: row.client_name || 'Geral',
        type: row.type,
        generatedAt: new Date(row.generated_at).toLocaleDateString('pt-BR'),
        status: row.file_url ? 'generated' : 'pending',
        hasWatermark: row.params_json?.watermark || false,
        downloadUrl: row.file_url,
      }));

      return { reports };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Generate Report
  fastify.post('/reports/generate', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const { clientId, type, includeWatermark, customBranding } = request.body as any;

      if (!type) {
        return reply.code(400).send({ error: 'Report type is required' });
      }

      if (clientId) {
        // Verify access
        const accessCheck = await db.query(
          `SELECT 1 FROM customer_consultants 
           WHERE consultant_id = $1 AND customer_id = $2`,
          [consultantId, clientId]
        );

        if (accessCheck.rows.length === 0) {
          return reply.code(403).send({ error: 'Access denied to this client' });
        }
      }

      // Create report record
      const result = await db.query(
        `INSERT INTO reports (owner_user_id, target_user_id, type, params_json)
         VALUES ($1, $2, $3, $4)
         RETURNING id, created_at`,
        [
          consultantId,
          clientId || null,
          type,
          JSON.stringify({
            watermark: includeWatermark || false,
            branding: customBranding || false,
          }),
        ]
      );

      // TODO: Actually generate PDF report here
      // For now, we'll just return the report record

      return {
        report: {
          id: result.rows[0].id,
          type,
          generatedAt: new Date(result.rows[0].created_at).toLocaleDateString('pt-BR'),
          status: 'pending', // Will be 'generated' once PDF is created
        },
        message: 'Report generation started. It will be available shortly.',
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}

