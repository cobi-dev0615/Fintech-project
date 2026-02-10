import { FastifyInstance } from 'fastify';

export async function consultantRoutes(fastify: FastifyInstance) {
  // Consultant API routes - add your consultant endpoints here
  fastify.get('/', async (_request, reply) => {
    return reply.send({ message: 'Consultant API', status: 'ok' });
  });
}
