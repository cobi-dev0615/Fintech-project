import { db } from '../db/connection.js';
import { syncPluggyData } from './pluggy-sync.js';
import { updateItem } from './pluggy.js';

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

let intervalId: ReturnType<typeof setInterval> | null = null;

async function syncAllConnections(): Promise<void> {
  console.log('[SyncScheduler] Starting scheduled sync for all active connections...');

  let synced = 0;
  let failed = 0;

  try {
    const result = await db.query(
      `SELECT c.id, c.user_id, c.external_consent_id, c.last_sync_at
       FROM connections c
       WHERE c.status = 'connected'
         AND c.external_consent_id IS NOT NULL`
    );

    const connections = result.rows;
    console.log(`[SyncScheduler] Found ${connections.length} active connection(s)`);

    for (const conn of connections) {
      // Skip if synced less than 1 hour ago
      if (conn.last_sync_at) {
        const msSinceSync = Date.now() - new Date(conn.last_sync_at).getTime();
        if (msSinceSync < ONE_HOUR_MS) {
          console.log(`[SyncScheduler] Skipping connection ${conn.id} (synced ${Math.round(msSinceSync / 60000)}min ago)`);
          continue;
        }
      }

      try {
        // Trigger Pluggy-side data refresh
        await updateItem(conn.external_consent_id);

        // Brief delay for Pluggy to process
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Pull data into our DB
        await syncPluggyData(conn.user_id, conn.external_consent_id);

        // Update sync timestamp
        await db.query(
          `UPDATE connections
           SET last_sync_at = NOW(), last_sync_status = 'ok', updated_at = NOW()
           WHERE id = $1`,
          [conn.id]
        );

        synced++;
        console.log(`[SyncScheduler] Synced connection ${conn.id} for user ${conn.user_id}`);
      } catch (error: any) {
        failed++;
        console.error(`[SyncScheduler] Failed to sync connection ${conn.id}:`, error.message);

        // Mark sync failure but don't stop processing others
        try {
          await db.query(
            `UPDATE connections
             SET last_sync_status = 'error', last_error = $1, updated_at = NOW()
             WHERE id = $2`,
            [error.message?.substring(0, 500) || 'Unknown error', conn.id]
          );
        } catch {
          // Ignore DB update errors
        }
      }
    }
  } catch (error: any) {
    console.error('[SyncScheduler] Error querying connections:', error.message);
  }

  console.log(`[SyncScheduler] Sync complete — ${synced} synced, ${failed} failed`);
}

export function startSyncScheduler(): void {
  if (intervalId) {
    console.warn('[SyncScheduler] Scheduler already running');
    return;
  }

  console.log('[SyncScheduler] Sync scheduler started (every 6 hours)');

  intervalId = setInterval(() => {
    syncAllConnections().catch(err =>
      console.error('[SyncScheduler] Unhandled error:', err)
    );
  }, SIX_HOURS_MS);
}

export function stopSyncScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[SyncScheduler] Sync scheduler stopped');
  }
}
