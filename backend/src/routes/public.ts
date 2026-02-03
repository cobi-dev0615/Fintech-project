import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';

/**
 * Public routes (no auth) for landing page and public-facing data.
 */
export async function publicRoutes(fastify: FastifyInstance) {
  // Platform stats for landing page stats section
  fastify.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      let activeUsers = 0;
      let consolidatedAssets = 0;
      let synchronizedTransactions = 0;

      try {
        const usersResult = await db.query(
          `SELECT COUNT(*) as count FROM users
           WHERE role IN ('customer', 'consultant')
           AND (is_active IS NULL OR is_active = true)`
        );
        activeUsers = parseInt(usersResult.rows[0]?.count || '0', 10);
      } catch {
        activeUsers = 0;
      }

      try {
        const hasAccounts = await db.query('SELECT 1 FROM pluggy_accounts LIMIT 1').then(() => true).catch(() => false);
        if (hasAccounts) {
          const accountsResult = await db.query(
            `SELECT COALESCE(SUM(current_balance), 0)::float as total FROM pluggy_accounts`
          );
          consolidatedAssets += parseFloat(accountsResult.rows[0]?.total || '0') || 0;
        }
      } catch {
        // ignore
      }
      try {
        const hasInvestments = await db.query('SELECT 1 FROM pluggy_investments LIMIT 1').then(() => true).catch(() => false);
        if (hasInvestments) {
          const invResult = await db.query(
            `SELECT COALESCE(SUM(current_value), 0)::float as total FROM pluggy_investments`
          );
          consolidatedAssets += parseFloat(invResult.rows[0]?.total || '0') || 0;
        }
      } catch {
        // ignore
      }
      consolidatedAssets = Math.max(0, consolidatedAssets);

      try {
        const hasTx = await db.query('SELECT 1 FROM pluggy_transactions LIMIT 1').then(() => true).catch(() => false);
        if (hasTx) {
          const txResult = await db.query(
            `SELECT COUNT(*) as count FROM pluggy_transactions`
          );
          synchronizedTransactions = parseInt(txResult.rows[0]?.count || '0', 10);
        }
      } catch {
        synchronizedTransactions = 0;
      }

      return {
        activeUsers,
        consolidatedAssets: Math.round(consolidatedAssets * 100) / 100,
        synchronizedTransactions,
      };
    } catch (error: any) {
      fastify.log.error('Error fetching platform stats:', error);
      reply.code(500).send({ error: 'Failed to fetch platform stats' });
    }
  });
}
