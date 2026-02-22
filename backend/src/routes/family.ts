import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';

export async function familyRoutes(fastify: FastifyInstance) {

  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).userId;
    try {
      const groupResult = await db.query(
        `SELECT fg.* FROM family_groups fg LEFT JOIN family_members fm ON fm.group_id = fg.id WHERE fg.owner_id = $1 OR (fm.user_id = $1 AND fm.status = 'accepted') LIMIT 1`, [userId]);
      if (groupResult.rows.length === 0) return reply.send({ group: null, members: [] });
      const group = groupResult.rows[0];
      const members = await db.query(
        `SELECT fm.*, u.full_name, u.email FROM family_members fm LEFT JOIN users u ON u.id = fm.user_id WHERE fm.group_id = $1 ORDER BY fm.role, fm.invited_at`, [group.id]);
      return reply.send({ group, members: members.rows });
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  fastify.post('/create', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).userId;
    const body = request.body as any;
    const name = body?.name || 'Minha Familia';
    try {
      const existing = await db.query('SELECT id FROM family_groups WHERE owner_id = $1', [userId]);
      if (existing.rows.length > 0) return reply.code(400).send({ error: 'Voce ja possui um grupo familiar' });
      const group = await db.query('INSERT INTO family_groups (name, owner_id) VALUES ($1, $2) RETURNING *', [name, userId]);
      await db.query(`INSERT INTO family_members (group_id, user_id, role, status, accepted_at) VALUES ($1, $2, 'owner', 'accepted', NOW())`, [group.rows[0].id, userId]);
      return reply.send({ group: group.rows[0] });
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  fastify.post('/invite', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).userId;
    const body = request.body as any;
    const email = body?.email;
    const role = body?.role || 'member';
    if (!email) return reply.code(400).send({ error: 'Email obrigatorio' });
    try {
      const group = await db.query('SELECT id FROM family_groups WHERE owner_id = $1', [userId]);
      if (group.rows.length === 0) return reply.code(404).send({ error: 'Grupo nao encontrado' });
      const groupId = group.rows[0].id;
      const dup = await db.query('SELECT id FROM family_members WHERE group_id = $1 AND invited_email = $2', [groupId, email]);
      if (dup.rows.length > 0) return reply.code(400).send({ error: 'Membro ja convidado' });
      const userResult = await db.query('SELECT id FROM users WHERE email = $1', [email]);
      const invitedUserId = userResult.rows[0]?.id || null;
      const member = await db.query(
        'INSERT INTO family_members (group_id, user_id, invited_email, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [groupId, invitedUserId, email, role, invitedUserId ? 'accepted' : 'pending']);
      return reply.send({ member: member.rows[0] });
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  fastify.delete('/member/:id', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).userId;
    const { id } = request.params as any;
    try {
      await db.query('DELETE FROM family_members WHERE id = $1 AND group_id IN (SELECT id FROM family_groups WHERE owner_id = $2)', [id, userId]);
      return reply.send({ success: true });
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  fastify.get('/summary', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).userId;
    try {
      const group = await db.query(
        `SELECT fg.id FROM family_groups fg LEFT JOIN family_members fm ON fm.group_id = fg.id WHERE fg.owner_id = $1 OR (fm.user_id = $1 AND fm.status = 'accepted') LIMIT 1`, [userId]);
      if (group.rows.length === 0) return reply.send({ totalNetWorth: 0, members: [] });
      const members = await db.query(
        `SELECT fm.user_id, fm.role, fm.invited_email, u.full_name FROM family_members fm LEFT JOIN users u ON u.id = fm.user_id WHERE fm.group_id = $1 AND fm.status = 'accepted'`, [group.rows[0].id]);
      const memberSummaries = [];
      for (const m of members.rows) {
        if (!m.user_id) continue;
        const acc = await db.query('SELECT COALESCE(SUM(current_balance::numeric), 0) as total FROM accounts WHERE user_id = $1', [m.user_id]);
        const inv = await db.query('SELECT COALESCE(SUM(current_value::numeric), 0) as total FROM investments WHERE user_id = $1', [m.user_id]);
        const netWorth = parseFloat(acc.rows[0].total) + parseFloat(inv.rows[0].total);
        memberSummaries.push({ userId: m.user_id, name: m.full_name || m.invited_email, role: m.role, netWorth });
      }
      const totalNetWorth = memberSummaries.reduce((sum, m) => sum + m.netWorth, 0);
      return reply.send({ totalNetWorth, members: memberSummaries });
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });
}
