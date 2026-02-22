import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';

export async function pushRoutes(fastify: FastifyInstance) {

  // POST /users/push-token — Register push token
  fastify.post('/users/push-token', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).userId;
    const body = request.body as any;
    const token = body?.token;
    const platform = body?.platform || 'unknown';
    if (!token) return reply.code(400).send({ error: 'Token required' });
    try {
      await db.query('UPDATE users SET push_token = $1, push_platform = $2 WHERE id = $3', [token, platform, userId]);
      console.log('[Push] Token registered for user', userId, 'platform:', platform);
      return reply.send({ success: true });
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  // DELETE /users/push-token — Unregister push token
  fastify.delete('/users/push-token', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).userId;
    try {
      await db.query('UPDATE users SET push_token = NULL, push_platform = NULL WHERE id = $1', [userId]);
      console.log('[Push] Token removed for user', userId);
      return reply.send({ success: true });
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  // PATCH /users/push-preferences — Update notification preferences
  fastify.patch('/users/push-preferences', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).userId;
    const body = request.body as any;
    const allowed = ['distribution', 'maturity', 'invoice', 'insight', 'system'];
    const prefs: Record<string, boolean> = {};
    for (const key of allowed) {
      if (typeof body?.[key] === 'boolean') prefs[key] = body[key];
    }
    if (Object.keys(prefs).length === 0) return reply.code(400).send({ error: 'No valid preferences' });
    try {
      // Merge with existing preferences
      const current = await db.query('SELECT push_preferences FROM users WHERE id = $1', [userId]);
      const existing = current.rows[0]?.push_preferences || {};
      const merged = { ...existing, ...prefs };
      await db.query('UPDATE users SET push_preferences = $1 WHERE id = $2', [JSON.stringify(merged), userId]);
      console.log('[Push] Preferences updated for user', userId, merged);
      return reply.send({ success: true, preferences: merged });
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });
}
