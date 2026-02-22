import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';
import crypto from 'crypto';

async function sendInviteEmail(toEmail: string, inviterName: string, groupName: string, inviteToken: string): Promise<boolean> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM || 'noreply@zurt.com.br';
  if (!apiKey) { console.log('[Family] SendGrid not configured'); return false; }
  const acceptUrl = `https://zurt.com.br/invite/${inviteToken}`;
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#080D14;font-family:'Helvetica Neue',Arial,sans-serif;"><div style="max-width:600px;margin:0 auto;padding:40px 20px;"><div style="text-align:center;margin-bottom:40px;"><h1 style="color:#00D4AA;font-size:36px;letter-spacing:6px;margin:0;">ZURT</h1><p style="color:#64748B;font-size:12px;letter-spacing:3px;margin:4px 0;">WEALTH INTELLIGENCE</p></div><div style="background:#0D1520;border-radius:16px;padding:40px;border:1px solid #1A2A3A;"><h2 style="color:#FFFFFF;font-size:22px;margin:0 0 16px;">Convite para Grupo Familiar</h2><p style="color:#A0AEC0;font-size:15px;line-height:1.6;"><strong style="color:#00D4AA;">${inviterName}</strong> convidou voce para o grupo <strong style="color:#FFFFFF;">"${groupName}"</strong> na plataforma ZURT.</p><p style="color:#A0AEC0;font-size:15px;line-height:1.6;">Consolide seus investimentos, acompanhe seu patrimonio e receba insights de IA.</p><div style="text-align:center;margin:32px 0;"><a href="${acceptUrl}" style="background:#00D4AA;color:#080D14;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;">Aceitar Convite</a></div><p style="color:#64748B;font-size:13px;text-align:center;">Ou copie: ${acceptUrl}</p></div><div style="text-align:center;margin-top:30px;"><p style="color:#4A5568;font-size:11px;">Convite expira em 7 dias. ZURT - zurt.com.br</p></div></div></body></html>`;
  try {
    const r = await fetch('https://api.sendgrid.com/v3/mail/send', { method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ personalizations: [{ to: [{ email: toEmail }] }], from: { email: fromEmail, name: 'ZURT' }, subject: `${inviterName} convidou voce para o grupo familiar no ZURT`, content: [{ type: 'text/html', value: html }] }) });
    console.log('[Family] Email to', toEmail, 'status:', r.status);
    return r.status >= 200 && r.status < 300;
  } catch (e: any) { console.log('[Family] Email error:', e.message); return false; }
}

export async function autoAcceptFamilyInvites(userId: string, email: string): Promise<number> {
  try {
    const r = await db.query(`UPDATE family_members SET user_id = $1, status = 'accepted', accepted_at = NOW() WHERE invited_email = $2 AND status = 'pending' RETURNING id`, [userId, email]);
    if (r.rows.length > 0) console.log(`[Family] Auto-accepted ${r.rows.length} invite(s) for ${email}`);
    return r.rows.length;
  } catch (e: any) { console.log('[Family] Auto-accept error:', e.message); return 0; }
}

export async function familyRoutes(fastify: FastifyInstance) {

  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).userId;
    try {
      const gr = await db.query(`SELECT fg.* FROM family_groups fg LEFT JOIN family_members fm ON fm.group_id = fg.id WHERE fg.owner_id = $1 OR (fm.user_id = $1 AND fm.status = 'accepted') LIMIT 1`, [userId]);
      if (gr.rows.length === 0) return reply.send({ group: null, members: [] });
      const group = gr.rows[0];
      const members = await db.query(`SELECT fm.id, fm.user_id, fm.invited_email, fm.role, fm.status, fm.visibility, fm.invited_at, fm.accepted_at, u.full_name, u.email FROM family_members fm LEFT JOIN users u ON u.id = fm.user_id WHERE fm.group_id = $1 ORDER BY fm.role DESC, fm.invited_at`, [group.id]);
      return reply.send({ group, members: members.rows });
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  fastify.post('/create', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).userId;
    const body = request.body as any;
    const name = body?.name || 'Minha Familia';
    try {
      const ex = await db.query('SELECT * FROM family_groups WHERE owner_id = $1', [userId]);
      if (ex.rows.length > 0) return reply.send({ group: ex.rows[0], existing: true });
      const g = await db.query('INSERT INTO family_groups (name, owner_id) VALUES ($1, $2) RETURNING *', [name, userId]);
      await db.query(`INSERT INTO family_members (group_id, user_id, role, status, visibility, accepted_at) VALUES ($1, $2, 'owner', 'accepted', 'full', NOW())`, [g.rows[0].id, userId]);
      return reply.send({ group: g.rows[0] });
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  fastify.post('/invite', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).userId;
    const body = request.body as any;
    const email = body?.email?.toLowerCase()?.trim();
    const role = body?.role || 'member';
    if (!email) return reply.code(400).send({ error: 'Email obrigatorio' });
    try {
      const g = await db.query('SELECT id, name FROM family_groups WHERE owner_id = $1', [userId]);
      if (g.rows.length === 0) return reply.code(404).send({ error: 'Grupo nao encontrado' });
      const groupId = g.rows[0].id;
      const dup = await db.query('SELECT id, status FROM family_members WHERE group_id = $1 AND invited_email = $2', [groupId, email]);
      if (dup.rows.length > 0 && dup.rows[0].status !== 'rejected') return reply.code(400).send({ error: 'Membro ja convidado' });
      if (dup.rows.length > 0) await db.query("UPDATE family_members SET status = 'pending', invited_at = NOW() WHERE id = $1", [dup.rows[0].id]);
      const token = crypto.randomBytes(32).toString('hex');
      const eu = await db.query('SELECT id FROM users WHERE email = $1', [email]);
      const uid = eu.rows[0]?.id || null;
      const st = uid ? 'accepted' : 'pending';
      let member;
      if (dup.rows.length === 0) {
        member = await db.query(`INSERT INTO family_members (group_id, user_id, invited_email, role, status, invite_token, visibility, accepted_at) VALUES ($1, $2, $3, $4, $5, $6, 'total', $7) RETURNING *`, [groupId, uid, email, role, st, token, uid ? new Date().toISOString() : null]);
      } else { member = await db.query('SELECT * FROM family_members WHERE id = $1', [dup.rows[0].id]); }
      const inv = await db.query('SELECT full_name FROM users WHERE id = $1', [userId]);
      const invName = inv.rows[0]?.full_name || 'Um membro do ZURT';
      const sent = await sendInviteEmail(email, invName, g.rows[0].name, token);
      return reply.send({ member: member.rows[0], emailSent: sent, autoAccepted: st === 'accepted', message: st === 'accepted' ? 'Membro adicionado automaticamente!' : sent ? 'Convite enviado por email!' : 'Convite criado. Compartilhe o link manualmente.' });
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  fastify.post('/accept/:token', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).userId;
    const { token } = request.params as any;
    try {
      const inv = await db.query("SELECT * FROM family_members WHERE invite_token = $1 AND status = 'pending'", [token]);
      if (inv.rows.length === 0) return reply.code(404).send({ error: 'Convite nao encontrado ou ja aceito' });
      await db.query("UPDATE family_members SET user_id = $1, status = 'accepted', accepted_at = NOW() WHERE id = $2", [userId, inv.rows[0].id]);
      return reply.send({ success: true, message: 'Convite aceito!' });
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  fastify.post('/reject/:token', async (request: FastifyRequest, reply: FastifyReply) => {
    const { token } = request.params as any;
    try {
      await db.query("UPDATE family_members SET status = 'rejected' WHERE invite_token = $1", [token]);
      return reply.send({ success: true });
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  fastify.put('/member/:id/visibility', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).userId;
    const { id } = request.params as any;
    const body = request.body as any;
    const vis = body?.visibility;
    if (!['total', 'detailed', 'full'].includes(vis)) return reply.code(400).send({ error: 'Visibility: total, detailed, full' });
    try {
      const m = await db.query('SELECT * FROM family_members WHERE id = $1', [id]);
      if (m.rows.length === 0) return reply.code(404).send({ error: 'Membro nao encontrado' });
      const isOwner = await db.query('SELECT id FROM family_groups WHERE id = $1 AND owner_id = $2', [m.rows[0].group_id, userId]);
      if (!isOwner.rows.length && m.rows[0].user_id !== userId) return reply.code(403).send({ error: 'Sem permissao' });
      await db.query('UPDATE family_members SET visibility = $1 WHERE id = $2', [vis, id]);
      return reply.send({ success: true, visibility: vis });
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  fastify.delete('/member/:id', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).userId;
    const { id } = request.params as any;
    try {
      const m = await db.query('SELECT * FROM family_members WHERE id = $1', [id]);
      if (m.rows.length === 0) return reply.code(404).send({ error: 'Nao encontrado' });
      if (m.rows[0].role === 'owner') return reply.code(400).send({ error: 'Nao pode remover o dono' });
      const isOwner = await db.query('SELECT id FROM family_groups WHERE id = $1 AND owner_id = $2', [m.rows[0].group_id, userId]);
      if (!isOwner.rows.length && m.rows[0].user_id !== userId) return reply.code(403).send({ error: 'Sem permissao' });
      await db.query('DELETE FROM family_members WHERE id = $1', [id]);
      return reply.send({ success: true });
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  fastify.get('/summary', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).userId;
    try {
      const gr = await db.query(`SELECT fg.id FROM family_groups fg LEFT JOIN family_members fm ON fm.group_id = fg.id WHERE fg.owner_id = $1 OR (fm.user_id = $1 AND fm.status = 'accepted') LIMIT 1`, [userId]);
      if (gr.rows.length === 0) return reply.send({ totalNetWorth: 0, members: [] });
      const ms = await db.query(`SELECT fm.user_id, fm.role, fm.visibility, fm.invited_email, u.full_name FROM family_members fm LEFT JOIN users u ON u.id = fm.user_id WHERE fm.group_id = $1 AND fm.status = 'accepted'`, [gr.rows[0].id]);
      const sums: any[] = [];
      for (const m of ms.rows) {
        if (!m.user_id) continue;
        const a = await db.query('SELECT COALESCE(SUM(balance_cents::numeric)/100,0) as t FROM bank_accounts WHERE user_id=$1', [m.user_id]);
        const i = await db.query('SELECT COALESCE(SUM(current_value::numeric),0) as t FROM pluggy_investments WHERE user_id=$1', [m.user_id]);
        const nw = parseFloat(a.rows[0].t) + parseFloat(i.rows[0].t);
        const s: any = { userId: m.user_id, name: m.full_name || m.invited_email, role: m.role, netWorth: nw, visibility: m.visibility };
        if (m.visibility === 'detailed' || m.visibility === 'full') {
          s.accounts = (await db.query('SELECT name,type,current_balance,institution_name FROM bank_accounts WHERE user_id=$1', [m.user_id])).rows;
          s.investments = (await db.query('SELECT name,type,current_value,institution_name,ticker FROM pluggy_investments WHERE user_id=$1', [m.user_id])).rows;
        }
        if (m.visibility === 'full') { s.cards = (await db.query('SELECT brand,last4,institution_name FROM credit_cards WHERE user_id=$1', [m.user_id])).rows; }
        sums.push(s);
      }
      return reply.send({ totalNetWorth: sums.reduce((s,m)=>s+m.netWorth,0), members: sums });
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });

  fastify.get('/pending', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).userId;
    try {
      const u = await db.query('SELECT email FROM users WHERE id = $1', [userId]);
      if (u.rows.length === 0) return reply.send({ invites: [] });
      const inv = await db.query(`SELECT fm.id, fm.invite_token, fm.role, fm.invited_at, fg.name as group_name, u.full_name as inviter_name FROM family_members fm JOIN family_groups fg ON fg.id = fm.group_id JOIN users u ON u.id = fg.owner_id WHERE fm.invited_email = $1 AND fm.status = 'pending'`, [u.rows[0].email]);
      return reply.send({ invites: inv.rows });
    } catch (e: any) { return reply.code(500).send({ error: e.message }); }
  });
}
