import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';

export async function invitePageRoutes(fastify: FastifyInstance) {
  fastify.get('/:token', async (request: FastifyRequest, reply: FastifyReply) => {
    const { token } = request.params as any;
    try {
      const invite = await db.query(`SELECT fm.*, fg.name as group_name, u.full_name as inviter_name FROM family_members fm JOIN family_groups fg ON fg.id = fm.group_id JOIN users u ON u.id = fg.owner_id WHERE fm.invite_token = $1`, [token]);
      if (invite.rows.length === 0) {
        return reply.type('text/html').send('<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#080D14;display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:Helvetica Neue,Arial,sans-serif;"><div style="text-align:center;padding:40px;"><h1 style="color:#00D4AA;font-size:36px;letter-spacing:6px;">ZURT</h1><p style="color:#FF6B6B;font-size:18px;margin-top:20px;">Convite nao encontrado ou expirado.</p></div></body></html>');
      }
      const inv = invite.rows[0];
      if (inv.status === 'accepted') {
        return reply.type('text/html').send('<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#080D14;display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:Helvetica Neue,Arial,sans-serif;"><div style="text-align:center;padding:40px;max-width:500px;"><h1 style="color:#00D4AA;font-size:36px;letter-spacing:6px;">ZURT</h1><div style="background:#0D1520;border-radius:16px;padding:40px;border:1px solid #1A2A3A;margin-top:30px;"><div style="font-size:48px;margin-bottom:16px;">&#10004;</div><h2 style="color:#FFFFFF;font-size:22px;">Convite aceito!</h2><p style="color:#A0AEC0;font-size:15px;margin-top:12px;">Voce ja faz parte do grupo <strong style="color:#00D4AA;">' + inv.group_name + '</strong>. Abra o app ZURT para ver o patrimonio familiar.</p></div></div></body></html>');
      }
      return reply.type('text/html').send('<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#080D14;display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:Helvetica Neue,Arial,sans-serif;"><div style="text-align:center;padding:40px;max-width:500px;"><h1 style="color:#00D4AA;font-size:36px;letter-spacing:6px;">ZURT</h1><p style="color:#64748B;font-size:12px;letter-spacing:3px;">WEALTH INTELLIGENCE</p><div style="background:#0D1520;border-radius:16px;padding:40px;border:1px solid #1A2A3A;margin-top:30px;"><div style="font-size:48px;margin-bottom:16px;">&#128106;</div><h2 style="color:#FFFFFF;font-size:22px;">Convite Familiar</h2><p style="color:#A0AEC0;font-size:15px;line-height:1.6;margin-top:16px;"><strong style="color:#00D4AA;">' + inv.inviter_name + '</strong> convidou voce para o grupo <strong style="color:#FFFFFF;">"' + inv.group_name + '"</strong></p><p style="color:#A0AEC0;font-size:14px;margin-top:16px;">Crie sua conta no ZURT ou faca login. O convite sera aceito automaticamente.</p><div style="margin-top:32px;"><a href="https://zurt.com.br" style="background:#00D4AA;color:#080D14;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;">Criar Conta</a></div><p style="color:#64748B;font-size:12px;margin-top:16px;">Ja tem conta? O convite sera aceito ao fazer login.</p></div></div></body></html>');
    } catch (e: any) {
      return reply.type('text/html').send('<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;background:#080D14;display:flex;justify-content:center;align-items:center;min-height:100vh;"><div style="text-align:center;"><h1 style="color:#00D4AA;">ZURT</h1><p style="color:#FF6B6B;">Erro ao processar convite.</p></div></body></html>');
    }
  });
}
