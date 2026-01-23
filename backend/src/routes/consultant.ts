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

  // Get consultant profile
  fastify.get('/profile', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      
      // Get user data
      const userResult = await db.query(
        `SELECT id, full_name, email, role, phone, birth_date, risk_profile, created_at
         FROM users WHERE id = $1`,
        [consultantId]
      );
      
      if (userResult.rows.length === 0) {
        return reply.code(404).send({ error: 'User not found' });
      }
      
      const user = userResult.rows[0];
      
      // Get consultant profile if exists
      const profileResult = await db.query(
        `SELECT company_name, certification, watermark_text, calendly_url
         FROM consultant_profiles WHERE user_id = $1`,
        [consultantId]
      );
      
      const profile = profileResult.rows[0] || {
        company_name: null,
        certification: null,
        watermark_text: null,
        calendly_url: null,
      };
      
      // Map database fields to frontend fields
      return reply.send({
        user: {
          ...user,
          cref: profile.certification,
          specialty: profile.company_name,
          bio: profile.watermark_text,
          calendly_url: profile.calendly_url,
        }
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error', details: error.message });
    }
  });

  // Update consultant profile
  fastify.patch('/profile', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const body = request.body as any;
      
      // Update user fields
      const userUpdates: string[] = [];
      const userValues: any[] = [];
      let paramCount = 1;
      
      if (body.full_name) {
        userUpdates.push(`full_name = $${paramCount++}`);
        userValues.push(body.full_name);
      }
      if (body.phone) {
        userUpdates.push(`phone = $${paramCount++}`);
        userValues.push(body.phone);
      }
      if (body.country_code) {
        userUpdates.push(`country_code = $${paramCount++}`);
        userValues.push(body.country_code);
      }
      if (body.birth_date) {
        userUpdates.push(`birth_date = $${paramCount++}`);
        userValues.push(body.birth_date);
      }
      
      if (userUpdates.length > 0) {
        userValues.push(consultantId);
        await db.query(
          `UPDATE users SET ${userUpdates.join(', ')}, updated_at = NOW()
           WHERE id = $${paramCount}`,
          userValues
        );
      }
      
      // Update consultant profile fields
      // Map frontend fields: cref -> certification, bio -> watermark_text, specialty -> stored separately for now
      const profileFields: any = {};
      if (body.cref !== undefined) {
        profileFields.certification = body.cref || null;
      }
      if (body.bio !== undefined) {
        profileFields.watermark_text = body.bio || null;
      }
      if (body.specialty !== undefined) {
        // Store specialty in company_name for now (can be extended later with a proper field)
        profileFields.company_name = body.specialty || null;
      }
      if (body.company_name !== undefined) {
        profileFields.company_name = body.company_name || null;
      }
      if (body.calendly_url !== undefined) {
        profileFields.calendly_url = body.calendly_url || null;
      }
      
      if (Object.keys(profileFields).length > 0) {
        const profileFieldNames = Object.keys(profileFields);
        const profileValues: any[] = Object.values(profileFields);
        
        // Build placeholders for INSERT VALUES
        const insertPlaceholders = profileFieldNames.map((_, i) => `$${i + 2}`).join(', ');
        
        // Build UPDATE clause using EXCLUDED
        const updateClause = profileFieldNames.map(key => `${key} = EXCLUDED.${key}`).join(', ');
        
        // Upsert consultant profile
        await db.query(
          `INSERT INTO consultant_profiles (user_id, ${profileFieldNames.join(', ')}, updated_at)
           VALUES ($1, ${insertPlaceholders}, NOW())
           ON CONFLICT (user_id)
           DO UPDATE SET ${updateClause}, updated_at = NOW()`,
          [consultantId, ...profileValues]
        );
      }
      
      // Get updated user data
      const userResult = await db.query(
        `SELECT id, full_name, email, role, phone, birth_date, risk_profile, created_at
         FROM users WHERE id = $1`,
        [consultantId]
      );
      
      const profileResult = await db.query(
        `SELECT company_name, certification, watermark_text, calendly_url
         FROM consultant_profiles WHERE user_id = $1`,
        [consultantId]
      );
      
      const profile = profileResult.rows[0] || {
        company_name: null,
        certification: null,
        watermark_text: null,
        calendly_url: null,
      };
      
      // Map database fields to frontend fields
      return reply.send({
        user: {
          ...userResult.rows[0],
          cref: profile.certification,
          specialty: profile.company_name,
          bio: profile.watermark_text,
          calendly_url: profile.calendly_url,
        }
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error', details: error.message });
    }
  });

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

      // Check which tables exist
      let hasCustomerConsultants = false;
      let hasBankAccounts = false;
      let hasHoldings = false;
      let hasTasks = false;
      let hasCrmLeads = false;

      try {
        await db.query('SELECT 1 FROM customer_consultants LIMIT 1');
        hasCustomerConsultants = true;
      } catch {}

      try {
        await db.query('SELECT 1 FROM bank_accounts LIMIT 1');
        hasBankAccounts = true;
      } catch {}

      try {
        await db.query('SELECT 1 FROM holdings LIMIT 1');
        hasHoldings = true;
      } catch {}

      try {
        await db.query('SELECT 1 FROM tasks LIMIT 1');
        hasTasks = true;
      } catch {}

      try {
        await db.query('SELECT 1 FROM crm_leads LIMIT 1');
        hasCrmLeads = true;
      } catch {}

      // Get total clients
      let totalClients = 0;
      let newClients = 0;
      if (hasCustomerConsultants) {
        try {
          const clientsResult = await db.query(
            `SELECT COUNT(*) as count 
             FROM customer_consultants 
             WHERE consultant_id = $1 AND status = 'active'`,
            [consultantId]
          );
          totalClients = parseInt(clientsResult.rows[0].count) || 0;

          const newClientsResult = await db.query(
            `SELECT COUNT(*) as count 
             FROM customer_consultants 
             WHERE consultant_id = $1 
             AND status = 'active'
             AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
            [consultantId]
          );
          newClients = parseInt(newClientsResult.rows[0].count) || 0;
        } catch (error: any) {
          fastify.log.warn('Error fetching clients:', error.message);
        }
      }

      // Calculate total net worth under management
      let totalNetWorth = 0;
      if (hasCustomerConsultants && (hasBankAccounts || hasHoldings)) {
        try {
          let netWorthQuery = '';
          if (hasBankAccounts && hasHoldings) {
            netWorthQuery = `SELECT COALESCE(SUM(
              (SELECT COALESCE(SUM(balance_cents), 0) FROM bank_accounts WHERE user_id = cc.customer_id) +
              (SELECT COALESCE(SUM(market_value_cents), 0) FROM holdings WHERE user_id = cc.customer_id)
            ), 0) / 100.0 as total_net_worth
             FROM customer_consultants cc
             WHERE cc.consultant_id = $1 AND cc.status = 'active'`;
          } else if (hasBankAccounts) {
            netWorthQuery = `SELECT COALESCE(SUM(
              (SELECT COALESCE(SUM(balance_cents), 0) FROM bank_accounts WHERE user_id = cc.customer_id)
            ), 0) / 100.0 as total_net_worth
             FROM customer_consultants cc
             WHERE cc.consultant_id = $1 AND cc.status = 'active'`;
          } else if (hasHoldings) {
            netWorthQuery = `SELECT COALESCE(SUM(
              (SELECT COALESCE(SUM(market_value_cents), 0) FROM holdings WHERE user_id = cc.customer_id)
            ), 0) / 100.0 as total_net_worth
             FROM customer_consultants cc
             WHERE cc.consultant_id = $1 AND cc.status = 'active'`;
          }

          if (netWorthQuery) {
            const netWorthResult = await db.query(netWorthQuery, [consultantId]);
            totalNetWorth = parseFloat(netWorthResult.rows[0].total_net_worth) || 0;
          }
        } catch (error: any) {
          fastify.log.warn('Error calculating net worth:', error.message);
        }
      }

      // Get pending tasks
      let pendingTasks = 0;
      if (hasTasks) {
        try {
          const tasksResult = await db.query(
            `SELECT COUNT(*) as count 
             FROM tasks 
             WHERE consultant_id = $1 
             AND is_done = FALSE 
             AND (due_at IS NULL OR due_at <= NOW() + INTERVAL '1 day')`,
            [consultantId]
          );
          pendingTasks = parseInt(tasksResult.rows[0].count) || 0;
        } catch (error: any) {
          fastify.log.warn('Error fetching tasks:', error.message);
        }
      }

      // Get prospects count (CRM leads)
      let prospects = 0;
      let pipelineData: Array<{ stage: string; count: number }> = [];
      if (hasCrmLeads) {
        try {
          const prospectsResult = await db.query(
            `SELECT COUNT(*) as count 
             FROM crm_leads 
             WHERE consultant_id = $1 
             AND stage NOT IN ('won', 'lost')`,
            [consultantId]
          );
          prospects = parseInt(prospectsResult.rows[0].count) || 0;

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

          pipelineData = pipelineResult.rows.map(row => ({
            stage: row.stage,
            count: parseInt(row.count),
          }));
        } catch (error: any) {
          fastify.log.warn('Error fetching prospects:', error.message);
        }
      }

      // Get recent tasks
      let recentTasks: Array<{
        id: string;
        task: string;
        client: string;
        dueDate: string;
        priority: string;
      }> = [];
      if (hasTasks) {
        try {
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

          recentTasks = recentTasksResult.rows.map(row => ({
            id: row.id,
            task: row.title,
            client: row.client_name || 'Sem cliente',
            dueDate: row.due_at 
              ? new Date(row.due_at).toLocaleDateString('pt-BR')
              : 'Sem data',
            priority: row.due_at && new Date(row.due_at) <= new Date() ? 'high' : 'medium',
          }));
        } catch (error: any) {
          fastify.log.warn('Error fetching recent tasks:', error.message);
        }
      }

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
      fastify.log.error('Error fetching consultant dashboard metrics:', error);
      console.error('Full error:', error);
      reply.code(500).send({ error: 'Failed to fetch dashboard metrics', details: error.message });
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

      // Check which tables exist
      let hasCustomerConsultants = false;
      let hasBankAccounts = false;
      let hasHoldings = false;
      let hasClientNotes = false;

      try {
        await db.query('SELECT 1 FROM customer_consultants LIMIT 1');
        hasCustomerConsultants = true;
      } catch {}

      try {
        await db.query('SELECT 1 FROM bank_accounts LIMIT 1');
        hasBankAccounts = true;
      } catch {}

      try {
        await db.query('SELECT 1 FROM holdings LIMIT 1');
        hasHoldings = true;
      } catch {}

      try {
        await db.query('SELECT 1 FROM client_notes LIMIT 1');
        hasClientNotes = true;
      } catch {}

      // If customer_consultants table doesn't exist, return empty result
      if (!hasCustomerConsultants) {
        return {
          clients: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            totalPages: 0,
          },
        };
      }

      // Build net worth calculation based on available tables
      let netWorthQuery = '0';
      if (hasBankAccounts && hasHoldings) {
        netWorthQuery = `COALESCE(
          (SELECT SUM(balance_cents) FROM bank_accounts WHERE user_id = u.id) +
          (SELECT SUM(market_value_cents) FROM holdings WHERE user_id = u.id),
          0
        ) / 100.0`;
      } else if (hasBankAccounts) {
        netWorthQuery = `COALESCE(
          (SELECT SUM(balance_cents) FROM bank_accounts WHERE user_id = u.id),
          0
        ) / 100.0`;
      } else if (hasHoldings) {
        netWorthQuery = `COALESCE(
          (SELECT SUM(market_value_cents) FROM holdings WHERE user_id = u.id),
          0
        ) / 100.0`;
      }

      // Build last contact query based on available tables
      let lastContactQuery = 'NULL';
      if (hasClientNotes) {
        lastContactQuery = `(SELECT MAX(created_at) FROM client_notes WHERE customer_id = u.id AND consultant_id = $1)`;
      }

      let query = `
        SELECT 
          u.id,
          u.full_name as name,
          u.email,
          u.is_active,
          cc.status as relationship_status,
          cc.created_at as relationship_created_at,
          ${netWorthQuery} as net_worth,
          ${lastContactQuery} as last_contact
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
      
      let total = 0;
      try {
        const countResult = await db.query(countQuery, params);
        total = parseInt(countResult.rows[0].count) || 0;
      } catch (error: any) {
        fastify.log.warn('Error getting client count:', error.message);
      }

      query += ` ORDER BY cc.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(parseInt(limit), offset);

      let clients: Array<{
        id: string;
        name: string;
        email: string;
        netWorth: number;
        status: string;
        lastContact: string;
      }> = [];

      try {
        const result = await db.query(query, params);

        clients = result.rows.map(row => ({
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
      } catch (error: any) {
        fastify.log.warn('Error fetching clients:', error.message);
      }

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
      fastify.log.error('Error fetching clients:', error);
      console.error('Full error:', error);
      reply.code(500).send({ error: 'Failed to fetch clients', details: error.message });
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
      cache.delete(`consultant:${consultantId}:dashboard:metrics`);

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

      // Check if crm_leads table exists
      let hasCrmLeads = false;
      try {
        await db.query('SELECT 1 FROM crm_leads LIMIT 1');
        hasCrmLeads = true;
      } catch {}

      // If table doesn't exist, return empty array
      if (!hasCrmLeads) {
        return { prospects: [] };
      }

      let prospects: Array<{
        id: string;
        name: string;
        email: string;
        phone: string;
        stage: string;
        notes: string;
        createdAt: string;
      }> = [];

      try {
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

        prospects = result.rows.map(row => ({
          id: row.id,
          name: row.name || 'Sem nome',
          email: row.email || '',
          phone: row.phone || '',
          stage: row.stage,
          notes: row.notes || '',
          createdAt: row.created_at,
        }));
      } catch (error: any) {
        fastify.log.warn('Error fetching pipeline prospects:', error.message);
      }

      return { prospects };
    } catch (error: any) {
      fastify.log.error('Error fetching pipeline:', error);
      console.error('Full error:', error);
      reply.code(500).send({ error: 'Failed to fetch pipeline', details: error.message });
    }
  });

  // Create/Update Prospect
  fastify.post('/pipeline/prospects', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const { id, name, email, phone, stage, notes } = request.body as any;

      // Check if crm_leads table exists
      let hasCrmLeads = false;
      try {
        await db.query('SELECT 1 FROM crm_leads LIMIT 1');
        hasCrmLeads = true;
      } catch {
        hasCrmLeads = false;
      }

      if (!hasCrmLeads) {
        return reply.code(400).send({ error: 'CRM leads table does not exist. Please run database migrations.' });
      }

      // Validate stage enum value
      const validStages = ['lead', 'contacted', 'meeting', 'proposal', 'won', 'lost'];
      const finalStage = stage && validStages.includes(stage) ? stage : 'lead';

      // Convert empty strings to null for optional fields
      const finalName = name && name.trim() ? name.trim() : null;
      const finalEmail = email && email.trim() ? email.trim() : null;
      const finalPhone = phone && phone.trim() ? phone.trim() : null;
      const finalNotes = notes && notes.trim() ? notes.trim() : null;

      if (id) {
        // Update existing
        if (!finalEmail) {
          return reply.code(400).send({ error: 'Email is required' });
        }

        const result = await db.query(
          `UPDATE crm_leads
           SET full_name = $1, email = $2, phone = $3, stage = $4, notes = $5, updated_at = NOW()
           WHERE id = $6 AND consultant_id = $7
           RETURNING id, full_name as name, email, phone, stage, notes, created_at`,
          [finalName, finalEmail, finalPhone, finalStage, finalNotes, id, consultantId]
        );

        if (result.rows.length === 0) {
          return reply.code(404).send({ error: 'Prospect not found' });
        }

        // Clear cache
        cache.delete(`consultant:${consultantId}:dashboard:metrics`);

        return { prospect: result.rows[0] };
      } else {
        // Create new
        if (!finalEmail) {
          return reply.code(400).send({ error: 'Email is required' });
        }

        const result = await db.query(
          `INSERT INTO crm_leads (consultant_id, full_name, email, phone, stage, notes)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, full_name as name, email, phone, stage, notes, created_at`,
          [consultantId, finalName, finalEmail, finalPhone, finalStage, finalNotes]
        );

        // Clear cache
        cache.delete(`consultant:${consultantId}:dashboard:metrics`);

        return { prospect: result.rows[0] };
      }
    } catch (error: any) {
      fastify.log.error('Error creating/updating prospect:', error);
      fastify.log.error('Error details:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        constraint: error.constraint,
      });
      return reply.code(500).send({ 
        error: 'Internal server error',
        details: error.message || 'Unknown error'
      });
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

      // Check if crm_leads table exists
      let hasCrmLeads = false;
      try {
        await db.query('SELECT 1 FROM crm_leads LIMIT 1');
        hasCrmLeads = true;
      } catch {
        hasCrmLeads = false;
      }

      if (!hasCrmLeads) {
        return reply.code(400).send({ error: 'CRM leads table does not exist. Please run database migrations.' });
      }

      if (!stage) {
        return reply.code(400).send({ error: 'Stage is required' });
      }

      // Validate stage enum value
      const validStages = ['lead', 'contacted', 'meeting', 'proposal', 'won', 'lost'];
      if (!validStages.includes(stage)) {
        return reply.code(400).send({ 
          error: 'Invalid stage value',
          details: `Stage must be one of: ${validStages.join(', ')}`
        });
      }

      const result = await db.query(
        `UPDATE crm_leads
         SET stage = $1, updated_at = NOW()
         WHERE id = $2 AND consultant_id = $3
         RETURNING id, full_name as name, email, phone, stage, notes, created_at`,
        [stage, id, consultantId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Prospect not found' });
      }

      // Clear cache
      cache.delete(`consultant:${consultantId}:dashboard:metrics`);

      return { prospect: result.rows[0] };
    } catch (error: any) {
      fastify.log.error('Error updating prospect stage:', error);
      fastify.log.error('Error details:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        constraint: error.constraint,
      });
      return reply.code(500).send({ 
        error: 'Internal server error',
        details: error.message || 'Unknown error'
      });
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
      cache.delete(`consultant:${consultantId}:dashboard:metrics`);

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

      // Check if customer_consultants table exists
      let hasCustomerConsultants = false;
      try {
        await db.query('SELECT 1 FROM customer_consultants LIMIT 1');
        hasCustomerConsultants = true;
      } catch {}

      // If table doesn't exist, return empty array
      if (!hasCustomerConsultants) {
        return { invitations: [] };
      }

      // For MVP, we can use customer_consultants with status='pending' as invitations
      let invitations: Array<{
        id: string;
        email: string;
        name: string | null;
        status: string;
        sentAt: string;
        expiresAt: string | null;
      }> = [];

      try {
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

        invitations = result.rows.map(row => ({
          id: row.id,
          email: row.email || 'N/A',
          name: row.name || null,
          status: row.status === 'active' ? 'accepted' : 
                  row.status === 'pending' ? 'pending' : 'expired',
          sentAt: new Date(row.sent_at).toISOString().split('T')[0],
          expiresAt: row.expires_at ? new Date(row.expires_at).toISOString().split('T')[0] : null,
        }));
      } catch (error: any) {
        fastify.log.warn('Error fetching invitations:', error.message);
      }

      return { invitations };
    } catch (error: any) {
      fastify.log.error('Error fetching invitations:', error);
      console.error('Full error:', error);
      reply.code(500).send({ error: 'Failed to fetch invitations', details: error.message });
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

  // Create or Get Conversation
  fastify.post('/messages/conversations', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);
      const { customerId } = request.body as any;

      if (!customerId) {
        return reply.code(400).send({ error: 'Customer ID is required' });
      }

      // Check if customer exists and is a customer
      const customerCheck = await db.query(
        `SELECT id, role FROM users WHERE id = $1`,
        [customerId]
      );

      if (customerCheck.rows.length === 0) {
        return reply.code(404).send({ error: 'Customer not found' });
      }

      if (customerCheck.rows[0].role !== 'customer') {
        return reply.code(400).send({ error: 'User is not a customer' });
      }

      // Check if relationship exists (consultant must have access to this customer)
      const relationshipCheck = await db.query(
        `SELECT 1 FROM customer_consultants 
         WHERE consultant_id = $1 AND customer_id = $2 AND status = 'active'`,
        [consultantId, customerId]
      );

      if (relationshipCheck.rows.length === 0) {
        return reply.code(403).send({ 
          error: 'No active relationship with this customer. Please send an invitation first.' 
        });
      }

      // Check if conversation already exists
      const existingConv = await db.query(
        `SELECT id FROM conversations 
         WHERE consultant_id = $1 AND customer_id = $2`,
        [consultantId, customerId]
      );

      if (existingConv.rows.length > 0) {
        // Return existing conversation
        const convId = existingConv.rows[0].id;
        const customerResult = await db.query(
          `SELECT full_name FROM users WHERE id = $1`,
          [customerId]
        );

        return {
          conversation: {
            id: convId,
            clientId: customerId,
            clientName: customerResult.rows[0].full_name || 'Cliente',
          },
        };
      }

      // Create new conversation
      const result = await db.query(
        `INSERT INTO conversations (consultant_id, customer_id)
         VALUES ($1, $2)
         RETURNING id`,
        [consultantId, customerId]
      );

      const customerResult = await db.query(
        `SELECT full_name FROM users WHERE id = $1`,
        [customerId]
      );

      return {
        conversation: {
          id: result.rows[0].id,
          clientId: customerId,
          clientName: customerResult.rows[0].full_name || 'Cliente',
        },
      };
    } catch (error: any) {
      fastify.log.error('Error creating conversation:', error);
      reply.code(500).send({ error: 'Failed to create conversation', details: error.message });
    }
  });

  // Get Conversations
  fastify.get('/messages/conversations', {
    preHandler: [requireConsultant],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultantId = getConsultantId(request);

      // Check if tables exist
      let hasConversations = false;
      let hasMessages = false;

      try {
        await db.query('SELECT 1 FROM conversations LIMIT 1');
        hasConversations = true;
      } catch {}

      try {
        await db.query('SELECT 1 FROM messages LIMIT 1');
        hasMessages = true;
      } catch {}

      // If conversations table doesn't exist, return empty array
      if (!hasConversations) {
        return { conversations: [] };
      }

      let conversations: Array<{
        id: string;
        clientId: string;
        clientName: string;
        lastMessage: string;
        timestamp: string;
        unread: number;
      }> = [];

      try {
        // Build query based on available tables
        let query = `
          SELECT 
            c.id,
            c.customer_id,
            u.full_name as client_name,
            u.email as client_email,
        `;

        if (hasMessages) {
          query += `
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
          `;
        } else {
          query += `
            NULL as last_message,
            NULL as last_message_time,
            0 as unread_count,
          `;
        }

        query += `
            c.updated_at
          FROM conversations c
          JOIN users u ON c.customer_id = u.id
          WHERE c.consultant_id = $1
          ORDER BY c.updated_at DESC
        `;

        const result = await db.query(query, [consultantId]);

        conversations = result.rows.map(row => ({
          id: row.id,
          clientId: row.customer_id,
          clientName: row.client_name || 'Cliente',
          lastMessage: row.last_message || 'Nenhuma mensagem',
          timestamp: row.last_message_time 
            ? new Date(row.last_message_time).toISOString()
            : row.updated_at 
            ? new Date(row.updated_at).toISOString()
            : new Date().toISOString(),
          unread: parseInt(row.unread_count) || 0,
        }));
      } catch (error: any) {
        fastify.log.warn('Error fetching conversations:', error.message);
      }

      return { conversations };
    } catch (error: any) {
      fastify.log.error('Error fetching conversations:', error);
      console.error('Full error:', error);
      reply.code(500).send({ error: 'Failed to fetch conversations', details: error.message });
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
           m.body,
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
        content: row.body,
        timestamp: new Date(row.timestamp).toISOString(),
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
          timestamp: new Date(result.rows[0].created_at).toISOString(),
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

      // Check if reports table exists
      let hasReports = false;
      try {
        await db.query('SELECT 1 FROM reports LIMIT 1');
        hasReports = true;
      } catch {}

      // If table doesn't exist, return empty array
      if (!hasReports) {
        return { reports: [] };
      }

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

      let reports: Array<{
        id: string;
        clientName: string;
        type: string;
        generatedAt: string;
        status: string;
        hasWatermark: boolean;
        downloadUrl: string | null;
      }> = [];

      try {
        const result = await db.query(query, params);

        reports = result.rows.map(row => ({
          id: row.id,
          clientName: row.client_name || 'Geral',
          type: row.type,
          generatedAt: new Date(row.generated_at).toISOString(),
          status: row.file_url ? 'generated' : 'pending',
          hasWatermark: row.params_json?.watermark || false,
          downloadUrl: row.file_url,
        }));
      } catch (error: any) {
        fastify.log.warn('Error fetching reports:', error.message);
      }

      return { reports };
    } catch (error: any) {
      fastify.log.error('Error fetching reports:', error);
      console.error('Full error:', error);
      reply.code(500).send({ error: 'Failed to fetch reports', details: error.message });
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

      // Validate report type
      const validTypes = [
        'consolidated',
        'portfolio_analysis',
        'financial_planning',
        'monthly',
        'custom',
        'transactions',
        'monthly_evolution',
        'advisor_custom',
      ];
      if (!validTypes.includes(type)) {
        return reply.code(400).send({ 
          error: `Invalid report type. Valid types: ${validTypes.join(', ')}` 
        });
      }

      if (clientId) {
        // Verify access
        const accessCheck = await db.query(
          `SELECT 1 FROM customer_consultants 
           WHERE consultant_id = $1 AND customer_id = $2 AND status = 'active'`,
          [consultantId, clientId]
        );

        if (accessCheck.rows.length === 0) {
          return reply.code(403).send({ error: 'Access denied to this client' });
        }
      }

      // Check if reports table exists
      let hasReports = false;
      try {
        await db.query('SELECT 1 FROM reports LIMIT 1');
        hasReports = true;
      } catch {
        hasReports = false;
      }

      if (!hasReports) {
        return reply.code(500).send({ error: 'Reports table does not exist' });
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

      // Clear cache
      cache.delete(`consultant:${consultantId}:dashboard:metrics`);

      return {
        report: {
          id: result.rows[0].id,
          type,
          generatedAt: new Date(result.rows[0].created_at).toISOString(),
          status: 'pending', // Will be 'generated' once PDF is created
        },
        message: 'Relatório iniciado. Estará disponível em breve.',
      };
    } catch (error: any) {
      fastify.log.error('Error generating report:', error);
      reply.code(500).send({ error: 'Failed to generate report', details: error.message });
    }
  });
}

