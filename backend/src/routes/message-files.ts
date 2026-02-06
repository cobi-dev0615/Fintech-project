import path from 'path';
import fs from 'fs';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'messages');

export async function messageFileRoutes(fastify: FastifyInstance) {
  const requireAuth = async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  };

  fastify.get('/files/:filename', {
    preHandler: [requireAuth],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { filename } = request.params as { filename: string };
      const decoded = decodeURIComponent(filename);
      if (decoded.includes('..') || path.isAbsolute(decoded)) {
        return reply.code(400).send({ error: 'Invalid filename' });
      }
      const filePath = path.join(UPLOAD_DIR, path.basename(decoded));
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        return reply.code(404).send({ error: 'File not found' });
      }
      return reply.send(fs.createReadStream(filePath));
    } catch (e: any) {
      return reply.code(500).send({ error: 'File error' });
    }
  });
}
