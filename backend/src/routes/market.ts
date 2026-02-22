import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function marketRoutes(fastify: FastifyInstance) {
  fastify.get('/asset/:ticker', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { ticker } = request.params as any;
    const token = process.env.BRAPI_TOKEN || '';
    const url = `https://brapi.dev/api/quote/${encodeURIComponent(ticker)}?token=${token}&fundamental=true&dividends=true&range=1y&interval=1d&modules=summaryProfile,defaultKeyStatistics,financialData`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      return reply.send(data);
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch asset data' });
    }
  });
}
