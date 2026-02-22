import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';

const BRAPI = 'https://brapi.dev/api';
const BT = () => process.env.BRAPI_TOKEN || '';
const burl = (p: string) => BRAPI + p + (p.includes('?') ? '&' : '?') + 'token=' + BT();

async function safeFetch(url: string): Promise<any> {
  try { const r = await fetch(url); if (!r.ok) return null; return await r.json(); } catch { return null; }
}

export async function aiRoutes(fastify: FastifyInstance) {

  fastify.post('/insights', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).userId;
    const body = request.body as any;
    const message = body?.message || null;
    try {
      const [fin, mkt, name] = await Promise.all([getUserFinance(userId), getMarket(), getFirstName(userId)]);
      const q = message || 'Analise meu portfolio e o mercado. Insights acionaveis.';
      const sys = sysPrompt(name);
      const ctx = buildCtx(fin, mkt, q);
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) return reply.code(500).send({ error: 'AI not configured' });
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 800, system: sys, messages: [{ role: 'user', content: ctx }] }),
      });
      const data = await res.json() as any;
      const msg = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n') || 'Erro ao gerar insights.';
      const sug = extractSuggestions(msg);
      await db.query('INSERT INTO ai_usage (user_id, message_type, tokens_used) VALUES ($1, $2, $3)', [userId, 'insight', data.usage?.output_tokens || 0]);
      return reply.send({ message: msg, suggestions: sug });
    } catch (e: any) { fastify.log.error(e); return reply.code(500).send({ error: 'Failed' }); }
  });

  fastify.post('/chat', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).userId;
    const body = request.body as any;
    const message = body?.message;
    const cid = body?.conversationId;
    if (!message) return reply.code(400).send({ error: 'Message required' });
    try {
      const [fin, mkt, name] = await Promise.all([getUserFinance(userId), getMarket(), getFirstName(userId)]);
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) return reply.code(500).send({ error: 'AI not configured' });
      const sys = sysPrompt(name);
      const ctx = buildCtx(fin, mkt, message);
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 800, system: sys, messages: [{ role: 'user', content: ctx }] }),
      });
      const data = await res.json() as any;
      const msg = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n') || 'Erro.';
      const sug = extractSuggestions(msg);
      await db.query('INSERT INTO ai_usage (user_id, message_type, tokens_used) VALUES ($1, $2, $3)', [userId, 'chat', data.usage?.output_tokens || 0]);
      return reply.send({ message: msg, conversationId: cid || userId, suggestions: sug });
    } catch (e: any) { fastify.log.error(e); return reply.code(500).send({ error: 'Failed' }); }
  });

  fastify.post('/check-alerts', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).userId;
    try {
      const [fin, mkt] = await Promise.all([getUserFinance(userId), getMarket()]);
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) return reply.send({ alerts: [] });
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 400, system: 'Analise portfolio e mercado. Retorne JSON array com alertas relevantes. Se nada relevante, retorne []. Formato: [{"type":"warning|info|opportunity","title":"titulo","message":"1 frase"}]. Maximo 3 alertas.', messages: [{ role: 'user', content: JSON.stringify({ portfolio: fin, market: mkt }) }] }),
      });
      const data = await res.json() as any;
      const txt = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('') || '[]';
      try { return reply.send({ alerts: JSON.parse(txt.replace(/```json|```/g, '').trim()) }); } catch { return reply.send({ alerts: [] }); }
    } catch { return reply.send({ alerts: [] }); }
  });
}

function sysPrompt(name: string): string {
  return `Voce e o ZURT Agent, consultor financeiro pessoal da plataforma ZURT.

REGRAS:
- Chame o investidor de "${name}"
- SEJA DIRETO E OBJETIVO. Maximo 2 paragrafos curtos. Sem enrolacao, sem repeticao
- Quando perguntarem dados de mercado, VA DIRETO AO NUMERO. Ex: "Selic esta em 15% a.a." Pronto
- SEMPRE use os dados fornecidos no contexto. NUNCA diga que nao tem dados
- Formate: R$ com virgula (R$ 1.234,56), porcentagens com virgula (15,00%)
- Para perguntas simples (cotacao, selic, dolar), responda em 1-2 frases
- Para analises complexas, maximo 2 paragrafos curtos
- Termine com 1 insight acionavel quando relevante
- Disclaimer em recomendacoes de ativos`;
}

function buildCtx(fin: any, mkt: any, q: string): string {
  return `PORTFOLIO:\n${JSON.stringify(fin)}\n\nMERCADO (brapi.dev):\n${JSON.stringify(mkt)}\n\nPERGUNTA: ${q}`;
}

async function getMarket() {
  const r: any = { ts: new Date().toISOString() };
  const [ibov, acoes, moedas, selic, inflacao, cripto] = await Promise.all([
    safeFetch(burl('/quote/^BVSP')),
    safeFetch(burl('/quote/PETR4,VALE3,ITUB4,BBAS3,WEGE3,ABEV3,BBDC4,RENT3?fundamental=true')),
    safeFetch(burl('/v2/currency?currency=USD-BRL,EUR-BRL')),
    safeFetch(burl('/v2/prime-rate?country=brazil')),
    safeFetch(burl('/v2/inflation?country=brazil')),
    safeFetch(burl('/v2/crypto?coin=BTC,ETH&currency=BRL')),
  ]);
  if (ibov?.results?.[0]) { const i = ibov.results[0]; r.ibovespa = { pontos: i.regularMarketPrice, var: i.regularMarketChangePercent }; }
  if (acoes?.results) r.acoes = acoes.results.map((a: any) => ({ t: a.symbol, p: a.regularMarketPrice, v: a.regularMarketChangePercent, pe: a.priceEarnings, dy: a.dividendYield }));
  if (moedas?.currency) r.moedas = moedas.currency.map((c: any) => ({ par: c.fromCurrency+'/'+c.toCurrency, bid: c.bidPrice, var: c.bidVariation }));
  const sr = selic?.['prime-rate'];
  if (Array.isArray(sr) && sr.length > 0) r.selic = { taxa: sr[0].value + '% a.a.', data: sr[0].date };
  const inf = inflacao?.inflation;
  if (Array.isArray(inf) && inf.length > 0) r.ipca = { valor: inf[0].value, data: inf[0].date };
  if (cripto?.coins) r.cripto = cripto.coins.map((c: any) => ({ coin: c.coin, preco: c.regularMarketPrice, var: c.regularMarketChangePercent }));
  return r;
}

async function getFirstName(userId: string): Promise<string> {
  try { const r = await db.query('SELECT full_name FROM users WHERE id = $1', [userId]); return (r.rows[0]?.full_name || 'Investidor').split(' ')[0]; } catch { return 'Investidor'; }
}

async function getUserFinance(userId: string) {
  try {
    const [acc, inv, cards, tx] = await Promise.all([
      db.query('SELECT name, type, current_balance, institution_name FROM accounts WHERE user_id = $1', [userId]),
      db.query('SELECT name, type, current_value, institution_name FROM investments WHERE user_id = $1', [userId]),
      db.query('SELECT brand, last4, institution_name FROM credit_cards WHERE user_id = $1', [userId]),
      db.query('SELECT description, amount, date FROM transactions WHERE user_id = $1 ORDER BY date DESC LIMIT 10', [userId]),
    ]);
    return { contas: acc.rows, investimentos: inv.rows, cartoes: cards.rows, transacoes: tx.rows };
  } catch { return { contas: [], investimentos: [], cartoes: [], transacoes: [] }; }
}

function extractSuggestions(text: string): string[] {
  const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
  const qs = lines.filter((l: string) => (l.match(/^[-*•\d.]/) || l.includes('?')) && l.length > 10 && l.length < 80).map((l: string) => l.replace(/^[-*•\d.)]+\s*/, '').trim()).filter((s: string) => s.includes('?'));
  if (qs.length >= 2) return qs.slice(0, 3);
  return ['Como esta meu portfolio?', 'Quanto esta o dolar?', 'Me de sugestoes de investimento'];
}

// Report endpoint - inside aiRoutes but added separately
// Will be registered by the existing aiRoutes function

// Report endpoint - inside aiRoutes but added separately
// Will be registered by the existing aiRoutes function

// This needs to be added INSIDE the aiRoutes function
// Workaround: create separate file
