import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';

const BRAPI = 'https://brapi.dev/api';
const burl = (p: string) => BRAPI + p + (p.includes('?') ? '&' : '?') + 'token=' + (process.env.BRAPI_TOKEN || '');

async function safeFetch(url: string): Promise<any> {
  try { const r = await fetch(url); if (!r.ok) return null; return await r.json(); } catch { return null; }
}

export async function reportRoutes(fastify: FastifyInstance) {
  fastify.post('/report', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).userId;
    const body = request.body as any;
    const period = body?.period || '1m';
    const language = body?.language || 'pt';
    const langMap: Record<string, string> = { pt: 'portugues brasileiro', en: 'english', zh: 'chinese mandarin', ar: 'arabic' };
    const lang = langMap[language] || 'portugues brasileiro';

    try {
      const [acc, inv, cards, userName] = await Promise.all([
        db.query('SELECT name, type, current_balance, institution_name FROM accounts WHERE user_id = $1', [userId]),
        db.query('SELECT name, type, current_value, institution_name, ticker FROM investments WHERE user_id = $1', [userId]),
        db.query('SELECT brand, last4, institution_name FROM credit_cards WHERE user_id = $1', [userId]),
        db.query('SELECT full_name FROM users WHERE id = $1', [userId]),
      ]);

      const fin = { contas: acc.rows, investimentos: inv.rows, cartoes: cards.rows };
      const name = (userName.rows[0]?.full_name || 'Investidor').split(' ')[0];

      const [ibov, moedas, selic] = await Promise.all([
        safeFetch(burl('/quote/^BVSP')),
        safeFetch(burl('/v2/currency?currency=USD-BRL')),
        safeFetch(burl('/v2/prime-rate?country=brazil')),
      ]);

      const mkt: any = {};
      if (ibov?.results?.[0]) mkt.ibovespa = { pontos: ibov.results[0].regularMarketPrice, var: ibov.results[0].regularMarketChangePercent };
      if (moedas?.currency?.[0]) mkt.dolar = { bid: moedas.currency[0].bidPrice };
      const sr = selic?.['prime-rate'];
      if (Array.isArray(sr) && sr.length > 0) mkt.selic = sr[0].value + '%';

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) return reply.code(500).send({ error: 'AI not configured' });

      const systemPrompt = `RESPONDA INTEIRAMENTE em ${lang}. Gere uma analise patrimonial profissional para o investidor ${name}. Estruture em secoes com titulos entre **:
**RESUMO EXECUTIVO** (2-3 frases)
**ANALISE DO PATRIMONIO** (detalhe contas e saldos)
**CARTEIRA DE INVESTIMENTOS** (analise ativos)
**CARTOES** (resumo)
**CENARIO DE MERCADO** (IBOV, Selic, dolar)
**RECOMENDACOES** (3-5 acoes numeradas)
**PERSPECTIVAS** (projecao)
Use numeros reais, formate R$. Tom profissional. Maximo 600 palavras.`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          system: systemPrompt,
          messages: [{ role: 'user', content: JSON.stringify({ portfolio: fin, market: mkt, period }) }]
        }),
      });

      const data = await response.json() as any;
      const analysis = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n') || '';

      return reply.send({ analysis, portfolio: fin, market: mkt, generatedAt: new Date().toISOString(), investorName: name });
    } catch (e: any) {
      fastify.log.error(e);
      return reply.code(500).send({ error: 'Failed to generate report' });
    }
  });
}
