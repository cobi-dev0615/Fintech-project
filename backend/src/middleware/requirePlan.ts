import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/connection.js';

/**
 * Feature codes used across the app:
 *   connections, reports, goals, ai, alerts, b3, calculators,
 *   messages, clients, pipeline, invitations, simulator, whitelabel, api_access
 *
 * limit_value semantics in plan_features:
 *   null  → unlimited access
 *   0     → blocked (feature not available)
 *   > 0   → max count (e.g., 3 reports/month, 1 goal)
 */

export interface PlanInfo {
  planId: string;
  planCode: string;
  planName: string;
  subscriptionStatus: string;
  connectionLimit: number | null;
}

export interface FeatureLimit {
  featureCode: string;
  limitValue: number | null;
}

/**
 * Fetches the user's active plan info and attaches it to the request.
 * Does NOT block — just enriches the request with plan data.
 */
export async function attachPlanInfo(request: FastifyRequest, _reply: FastifyReply) {
  const userId = (request.user as any)?.userId;
  if (!userId) return;

  try {
    const result = await db.query(
      `SELECT
         s.status,
         p.id as plan_id,
         p.code as plan_code,
         p.name as plan_name,
         p.connection_limit
       FROM subscriptions s
       JOIN plans p ON s.plan_id = p.id
       WHERE s.user_id = $1
         AND s.status IN ('active', 'trialing')
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      (request as any).plan = {
        planId: row.plan_id,
        planCode: row.plan_code,
        planName: row.plan_name,
        subscriptionStatus: row.status,
        connectionLimit: row.connection_limit,
      } as PlanInfo;
    } else {
      // No active subscription → treat as free plan
      (request as any).plan = null;
    }
  } catch {
    // If tables don't exist, silently skip
    (request as any).plan = null;
  }
}

/**
 * Checks if the user's plan allows a given feature.
 * Returns the feature limit or throws 403.
 *
 * Usage in route handler:
 *   const limit = await checkFeatureAccess(request, reply, 'reports');
 *   // limit is null (unlimited) or a number > 0
 */
export async function checkFeatureAccess(
  request: FastifyRequest,
  reply: FastifyReply,
  featureCode: string
): Promise<number | null> {
  const userId = (request.user as any)?.userId;

  try {
    // Get user's active plan and the specific feature limit in one query
    const result = await db.query(
      `SELECT
         p.code as plan_code,
         p.name as plan_name,
         pf.limit_value
       FROM subscriptions s
       JOIN plans p ON s.plan_id = p.id
       LEFT JOIN plan_features pf ON pf.plan_id = p.id AND pf.feature_code = $2
       WHERE s.user_id = $1
         AND s.status IN ('active', 'trialing')
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [userId, featureCode]
    );

    if (result.rows.length === 0) {
      // No active subscription → check free plan features
      const freeResult = await db.query(
        `SELECT pf.limit_value
         FROM plans p
         JOIN plan_features pf ON pf.plan_id = p.id AND pf.feature_code = $1
         WHERE p.code = 'free'
         LIMIT 1`,
        [featureCode]
      );

      if (freeResult.rows.length === 0 || freeResult.rows[0].limit_value === 0) {
        reply.code(403).send({
          error: 'upgrade_required',
          feature: featureCode,
          currentPlan: 'free',
          message: `This feature requires an upgraded plan.`,
        });
        return -1; // Signal that reply was sent
      }
      return freeResult.rows[0].limit_value;
    }

    const row = result.rows[0];
    const limitValue = row.limit_value;

    // If feature row is missing from plan_features, default to blocked
    if (limitValue === undefined || limitValue === null) {
      // null in DB means unlimited
      if (row.limit_value === null) return null;
    }

    if (limitValue === 0) {
      // Determine the minimum plan that grants this feature
      const minPlanResult = await db.query(
        `SELECT p.code
         FROM plan_features pf
         JOIN plans p ON p.id = pf.plan_id
         WHERE pf.feature_code = $1
           AND (pf.limit_value IS NULL OR pf.limit_value > 0)
           AND p.is_active = true
         ORDER BY p.price_cents ASC
         LIMIT 1`,
        [featureCode]
      );

      const requiredPlan = minPlanResult.rows[0]?.code || 'basic';

      reply.code(403).send({
        error: 'upgrade_required',
        feature: featureCode,
        currentPlan: row.plan_code,
        requiredPlan,
        message: `This feature requires the ${requiredPlan} plan or higher.`,
      });
      return -1;
    }

    return limitValue;
  } catch (err) {
    // If plan_features table doesn't exist, allow access (graceful degradation)
    return null;
  }
}

/**
 * Counts the user's current usage for a feature and checks against the limit.
 * Returns true if within limit, sends 403 if exceeded.
 *
 * @param countQuery - SQL query that returns a single count column, with $1 as userId
 */
export async function checkUsageLimit(
  request: FastifyRequest,
  reply: FastifyReply,
  featureCode: string,
  countQuery: string,
  queryParams?: any[]
): Promise<boolean> {
  const userId = (request.user as any)?.userId;
  const limit = await checkFeatureAccess(request, reply, featureCode);

  if (limit === -1) return false; // 403 already sent
  if (limit === null) return true; // unlimited

  // Count current usage
  try {
    const params = queryParams || [userId];
    const countResult = await db.query(countQuery, params);
    const currentCount = parseInt(countResult.rows[0]?.count || '0', 10);

    if (currentCount >= limit) {
      // Find the next plan up
      const nextPlanResult = await db.query(
        `SELECT p.code
         FROM plan_features pf
         JOIN plans p ON p.id = pf.plan_id
         WHERE pf.feature_code = $1
           AND (pf.limit_value IS NULL OR pf.limit_value > $2)
           AND p.is_active = true
         ORDER BY p.price_cents ASC
         LIMIT 1`,
        [featureCode, limit]
      );

      const upgradePlan = nextPlanResult.rows[0]?.code || 'pro';

      reply.code(403).send({
        error: 'limit_reached',
        feature: featureCode,
        currentUsage: currentCount,
        limit,
        upgradePlan,
        message: `You have reached your plan limit of ${limit}. Upgrade to the ${upgradePlan} plan for more.`,
      });
      return false;
    }

    return true;
  } catch {
    // Graceful degradation: allow if we can't count
    return true;
  }
}

/**
 * Gets all feature limits for a given plan code.
 */
export async function getPlanFeatures(planCode: string): Promise<Record<string, number | null>> {
  try {
    const result = await db.query(
      `SELECT pf.feature_code, pf.limit_value
       FROM plan_features pf
       JOIN plans p ON p.id = pf.plan_id
       WHERE p.code = $1`,
      [planCode]
    );

    const features: Record<string, number | null> = {};
    for (const row of result.rows) {
      features[row.feature_code] = row.limit_value;
    }
    return features;
  } catch {
    return {};
  }
}
