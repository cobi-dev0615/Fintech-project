import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { getClientIp } from '../utils/audit.js';
import { createAlert } from '../utils/notifications.js';

// Helper function to log login attempts
async function logLoginAttempt(userId: string | null, request: FastifyRequest, success: boolean, email?: string) {
  try {
    // Check if login_history table exists
    let hasLoginHistory = false;
    try {
      await db.query('SELECT 1 FROM login_history LIMIT 1');
      hasLoginHistory = true;
    } catch {}

    if (hasLoginHistory) {
      const ipAddress = getClientIp(request);
      const userAgent = request.headers['user-agent'] || null;

      // If no userId but we have email, try to find the user
      if (!userId && email) {
        const userResult = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userResult.rows.length > 0) {
          userId = userResult.rows[0].id;
        }
      }

      await db.query(
        `INSERT INTO login_history (user_id, ip_address, user_agent, success)
         VALUES ($1, $2, $3, $4)`,
        [userId, ipAddress, userAgent, success]
      );
    }
  } catch (error) {
    // Don't throw - login logging shouldn't break the login flow
    console.error('Failed to log login attempt:', error);
  }
}

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
      
      // Auto-approve specific test accounts
      const autoApprovedEmails = ['admin@zurt.com', 'customer@zurt.com', 'consultant@zurt.com'];
      const approvalStatus = autoApprovedEmails.includes(body.email.toLowerCase()) ? 'approved' : 'pending';
      // New users should be inactive until approved (unless auto-approved)
      const isActive = autoApprovedEmails.includes(body.email.toLowerCase());
      
      // Create user with appropriate approval status
      const result = await db.query(
        `INSERT INTO users (full_name, email, password_hash, role, approval_status, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, full_name, email, role, approval_status, created_at`,
        [body.full_name, body.email, passwordHash, body.role, approvalStatus, isActive]
      );
      
      const user = result.rows[0];
      
      // Notify all admins about the new registration
      try {
        const adminsResult = await db.query(
          'SELECT id FROM users WHERE role = $1 AND approval_status = $2',
          ['admin', 'approved']
        );
        
        for (const admin of adminsResult.rows) {
          await createAlert({
            userId: admin.id,
            severity: 'info',
            title: 'Nova Solicitação de Registro',
            message: `${user.full_name} (${user.email}) solicitou registro como ${user.role}`,
            notificationType: 'account_activity',
            linkUrl: `/admin/users`,
            metadata: {
              userId: user.id,
              userName: user.full_name,
              userEmail: user.email,
              userRole: user.role,
            },
          });
        }

        // Broadcast to connected admin WebSocket clients
        const websocket = (fastify as any).websocket;
        if (websocket && websocket.broadcastToAdmins) {
          websocket.broadcastToAdmins({
            type: 'new_registration',
            message: 'Nova solicitação de registro',
            userId: user.id,
            userName: user.full_name,
            userEmail: user.email,
            userRole: user.role,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        // Don't fail the request if notification fails
        fastify.log.error({ err: error }, 'Error sending notification for new registration');
      }
      
      // Return success but no token - user needs approval
      return reply.code(201).send({
        message: 'Registration successful. Your account is pending administrator approval.',
        requiresApproval: true,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          approval_status: user.approval_status,
        },
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
        `SELECT id, full_name, email, password_hash, role, is_active, 
         COALESCE(approval_status, 'approved') as approval_status 
         FROM users WHERE email = $1`,
        [body.email]
      );
      
      if (result.rows.length === 0) {
        // Log failed login attempt (user not found)
        await logLoginAttempt(null, request, false, body.email);
        return reply.code(401).send({ error: 'Invalid credentials' });
      }
      
      const user = result.rows[0];
      
      // Auto-approve specific test accounts (bypass approval check)
      const autoApprovedEmails = ['admin@zurt.com', 'customer@zurt.com', 'consultant@zurt.com'];
      const isAutoApproved = autoApprovedEmails.includes(user.email.toLowerCase());
      
      // Auto-approve and activate if it's one of the test accounts
      if (isAutoApproved) {
        if (user.approval_status !== 'approved' || !user.is_active) {
          await db.query(
            `UPDATE users SET approval_status = 'approved', is_active = true, updated_at = NOW() WHERE id = $1`,
            [user.id]
          );
          user.approval_status = 'approved';
          user.is_active = true;
        }
      }
      
      if (!user.is_active) {
        return reply.code(403).send({ error: 'Account is inactive' });
      }
      
      // Check approval status (skip for auto-approved accounts)
      if (!isAutoApproved && user.approval_status === 'pending') {
        await logLoginAttempt(user.id, request, false, body.email);
        return reply.code(403).send({ 
          error: 'Account pending approval',
          message: 'Your account is pending administrator approval. Please wait for approval before logging in.',
          approval_status: 'pending'
        });
      }
      
      if (user.approval_status === 'rejected') {
        await logLoginAttempt(user.id, request, false, body.email);
        return reply.code(403).send({ 
          error: 'Account rejected',
          message: 'Your registration has been rejected by the administrator. Please contact support for more information.',
          approval_status: 'rejected'
        });
      }
      
      // Verify password
      if (!user.password_hash) {
        // Log failed login attempt
        await logLoginAttempt(user.id, request, false, body.email);
        return reply.code(401).send({ error: 'Invalid credentials' });
      }
      
      const validPassword = await bcrypt.compare(body.password, user.password_hash);
      
      if (!validPassword) {
        // Log failed login attempt
        await logLoginAttempt(user.id, request, false, body.email);
        return reply.code(401).send({ error: 'Invalid credentials' });
      }
      
      // Log successful login
      await logLoginAttempt(user.id, request, true, body.email);
      
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
        'SELECT id, full_name, email, role, phone, country_code, birth_date, risk_profile, created_at FROM users WHERE id = $1',
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

  // Google OAuth - Initiate login
  fastify.get('/google', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const googleClientId = process.env.GOOGLE_CLIENT_ID;
      
      // Use exact redirect URI as configured in Google Console (must match exactly)
      // Google Console has: https://zurt.com.br/api/auth/google/callback
      const redirectUri = 'https://zurt.com.br/api/auth/google/callback';
      
      if (!googleClientId) {
        return reply.code(500).send({ error: 'Google OAuth not configured' });
      }

      // Build Google OAuth URL
      const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      googleAuthUrl.searchParams.set('client_id', googleClientId);
      googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
      googleAuthUrl.searchParams.set('response_type', 'code');
      googleAuthUrl.searchParams.set('scope', 'openid email profile');
      googleAuthUrl.searchParams.set('access_type', 'online');
      googleAuthUrl.searchParams.set('prompt', 'select_account');

      return reply.redirect(googleAuthUrl.toString());
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Google OAuth - Handle callback (GET from Google redirect)
  fastify.get('/google/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const code = (request.query as any).code;
      const error = (request.query as any).error;
      const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'https://www.zurt.com.br';

      if (error) {
        return reply.redirect(`${frontendUrl}/auth/google?error=${encodeURIComponent(error)}`);
      }

      if (!code) {
        return reply.redirect(`${frontendUrl}/auth/google?error=missing_code`);
      }

      const googleClientId = process.env.GOOGLE_CLIENT_ID;
      const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
      
      // Use exact redirect URI as configured in Google Console (must match exactly)
      // Google Console has: https://zurt.com.br/api/auth/google/callback
      const redirectUri = 'https://zurt.com.br/api/auth/google/callback';

      if (!googleClientId || !googleClientSecret) {
        return reply.redirect(`${frontendUrl}/auth/google?error=oauth_not_configured`);
      }

      // Exchange code for token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: googleClientId,
          client_secret: googleClientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        fastify.log.error('Google token exchange failed:', errorData);
        return reply.redirect(`${frontendUrl}/auth/google?error=token_exchange_failed`);
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Get user info from Google
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!userInfoResponse.ok) {
        return reply.redirect(`${frontendUrl}/auth/google?error=user_info_failed`);
      }

      const googleUser = await userInfoResponse.json();
      const email = googleUser.email;
      const fullName = googleUser.name || googleUser.given_name || 'User';
      const googleId = googleUser.id;

      if (!email) {
        return reply.redirect(`${frontendUrl}/auth/google?error=no_email`);
      }

      // Check if user exists
      const existingUser = await db.query(
        'SELECT id, full_name, email, password_hash, role, is_active, COALESCE(approval_status, \'approved\') as approval_status FROM users WHERE email = $1',
        [email]
      );

      let user;
      const autoApprovedEmails = ['admin@zurt.com', 'customer@zurt.com', 'consultant@zurt.com'];
      const isAutoApproved = autoApprovedEmails.includes(email.toLowerCase());

      if (existingUser.rows.length > 0) {
        // User exists - update if needed and log in
        user = existingUser.rows[0];

        // Auto-approve and activate if it's one of the test accounts
        if (isAutoApproved) {
          if (user.approval_status !== 'approved' || !user.is_active) {
            await db.query(
              `UPDATE users SET approval_status = 'approved', is_active = true, updated_at = NOW() WHERE id = $1`,
              [user.id]
            );
            user.approval_status = 'approved';
            user.is_active = true;
          }
        }

        if (!user.is_active) {
          return reply.redirect(`${frontendUrl}/auth/google?error=account_inactive`);
        }

        if (!isAutoApproved && user.approval_status === 'pending') {
          return reply.redirect(`${frontendUrl}/auth/google?error=account_pending&message=${encodeURIComponent('Your account is pending administrator approval')}`);
        }

        // Log successful login
        await logLoginAttempt(user.id, request, true, email);
      } else {
        // New user - create account
        // Google OAuth users should be pending approval unless auto-approved
        const approvalStatus = isAutoApproved ? 'approved' : 'pending';
        // New users should be inactive until approved (unless auto-approved)
        const isActive = isAutoApproved;
        
        const result = await db.query(
          `INSERT INTO users (full_name, email, role, approval_status, is_active, password_hash)
           VALUES ($1, $2, 'customer', $3, $4, NULL)
           RETURNING id, full_name, email, role, approval_status, is_active`,
          [fullName, email, approvalStatus, isActive]
        );

        user = result.rows[0];

        if (!isAutoApproved && approvalStatus === 'pending') {
          // Notify admins about new registration
          try {
            const adminsResult = await db.query(
              'SELECT id FROM users WHERE role = $1 AND approval_status = $2',
              ['admin', 'approved']
            );
            
            for (const admin of adminsResult.rows) {
              await createAlert({
                userId: admin.id,
                severity: 'info',
                title: 'Nova Solicitação de Registro',
                message: `${user.full_name} (${user.email}) solicitou registro via Google OAuth`,
                notificationType: 'account_activity',
                linkUrl: `/admin/users`,
                metadata: {
                  userId: user.id,
                  userName: user.full_name,
                  userEmail: user.email,
                  userRole: user.role,
                },
              });
            }
          } catch (error) {
            fastify.log.error({ err: error }, 'Error sending notification for new registration');
          }
        }

        // Log successful registration/login
        await logLoginAttempt(user.id, request, true, email);
      }

      // Check if user is approved and active before generating token
      if (!isAutoApproved && (user.approval_status === 'pending' || !user.is_active)) {
        return reply.redirect(`${frontendUrl}/auth/google?error=account_pending&message=${encodeURIComponent('Your account is pending administrator approval. Please wait for approval before logging in.')}`);
      }

      // Generate JWT token
      const token = fastify.jwt.sign({ userId: user.id, role: user.role });

      // Redirect to frontend with token
      return reply.redirect(`${frontendUrl}/auth/google?token=${token}`);
    } catch (error) {
      fastify.log.error(error);
      const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'https://www.zurt.com.br';
      return reply.redirect(`${frontendUrl}/auth/google?error=internal_error`);
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
