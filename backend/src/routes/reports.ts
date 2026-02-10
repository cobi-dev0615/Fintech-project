import { FastifyInstance } from 'fastify';

export async function reportsRoutes(fastify: FastifyInstance) {
  // Reports API routes - add your reports endpoints here
  fastify.get('/', async (_request, reply) => {
    return reply.send({ message: 'Reports API', status: 'ok' });
  });
}
