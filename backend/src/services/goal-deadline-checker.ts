import { db } from '../db/connection.js';
import { createAlert } from '../utils/notifications.js';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

let intervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Check for goals with deadlines within 7 days and send reminder notifications.
 * Also notifies when a goal's deadline has passed without being completed.
 *
 * Uses metadata_json to track sent reminders and avoid duplicates:
 * - "goal_deadline_7d:{goalId}" for 7-day reminders
 * - "goal_deadline_expired:{goalId}" for expired goal notifications
 */
async function checkGoalDeadlines(): Promise<void> {
  console.log('[GoalDeadlineChecker] Checking goal deadlines...');

  let reminded = 0;
  let expired = 0;

  try {
    // Check if goals table exists
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'goals'
      );
    `);

    if (!tableExists.rows[0]?.exists) {
      console.log('[GoalDeadlineChecker] Goals table does not exist, skipping');
      return;
    }

    // Find goals with deadlines within 7 days that are NOT yet completed
    const upcomingResult = await db.query(`
      SELECT g.id, g.user_id, g.title, g.target_amount_cents, g.current_amount_cents, g.target_date
      FROM goals g
      WHERE g.target_date IS NOT NULL
        AND g.target_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days')
        AND g.current_amount_cents < g.target_amount_cents
    `);

    for (const goal of upcomingResult.rows) {
      // Check if we already sent a 7-day reminder for this goal
      const alreadySent = await db.query(`
        SELECT id FROM alerts
        WHERE user_id = $1
          AND notification_type = 'goal_milestone'
          AND metadata_json->>'reminder_key' = $2
          AND created_at > (NOW() - INTERVAL '7 days')
      `, [goal.user_id, `goal_deadline_7d:${goal.id}`]);

      if (alreadySent.rows.length > 0) continue;

      const daysLeft = Math.ceil(
        (new Date(goal.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      const progress = Math.round(
        (parseFloat(goal.current_amount_cents) / parseFloat(goal.target_amount_cents)) * 100
      );

      await createAlert({
        userId: goal.user_id,
        severity: daysLeft <= 2 ? 'warning' : 'info',
        title: 'Goal Deadline Approaching',
        message: `Your goal "${goal.title}" is due in ${daysLeft} day(s). Current progress: ${progress}%.`,
        notificationType: 'goal_milestone',
        linkUrl: '/app/goals',
        metadata: {
          reminder_key: `goal_deadline_7d:${goal.id}`,
          goalId: goal.id,
          goalTitle: goal.title,
          daysLeft,
          progress,
          titleKey: 'notifications:goalDeadline.approachingTitle',
          messageKey: 'notifications:goalDeadline.approachingMessage',
          messageParams: { goalName: goal.title, daysLeft, progress },
        },
      });

      reminded++;
    }

    // Find goals whose deadline has passed and are NOT completed
    const expiredResult = await db.query(`
      SELECT g.id, g.user_id, g.title, g.target_amount_cents, g.current_amount_cents, g.target_date
      FROM goals g
      WHERE g.target_date IS NOT NULL
        AND g.target_date < CURRENT_DATE
        AND g.current_amount_cents < g.target_amount_cents
    `);

    for (const goal of expiredResult.rows) {
      // Check if we already sent an expired notification for this goal
      const alreadySent = await db.query(`
        SELECT id FROM alerts
        WHERE user_id = $1
          AND notification_type = 'goal_milestone'
          AND metadata_json->>'reminder_key' = $2
      `, [goal.user_id, `goal_deadline_expired:${goal.id}`]);

      if (alreadySent.rows.length > 0) continue;

      const progress = Math.round(
        (parseFloat(goal.current_amount_cents) / parseFloat(goal.target_amount_cents)) * 100
      );

      await createAlert({
        userId: goal.user_id,
        severity: 'warning',
        title: 'Goal Deadline Passed',
        message: `Your goal "${goal.title}" has passed its deadline. Progress: ${progress}%.`,
        notificationType: 'goal_milestone',
        linkUrl: '/app/goals',
        metadata: {
          reminder_key: `goal_deadline_expired:${goal.id}`,
          goalId: goal.id,
          goalTitle: goal.title,
          progress,
          titleKey: 'notifications:goalDeadline.expiredTitle',
          messageKey: 'notifications:goalDeadline.expiredMessage',
          messageParams: { goalName: goal.title, progress },
        },
      });

      expired++;
    }
  } catch (error: any) {
    console.error('[GoalDeadlineChecker] Error checking deadlines:', error.message);
  }

  console.log(`[GoalDeadlineChecker] Done — ${reminded} reminder(s), ${expired} expired notification(s)`);
}

export function startGoalDeadlineChecker(): void {
  if (intervalId) {
    console.warn('[GoalDeadlineChecker] Already running');
    return;
  }

  console.log('[GoalDeadlineChecker] Started (checks every 24 hours)');

  // Run once at startup (with short delay to let DB connections settle)
  setTimeout(() => {
    checkGoalDeadlines().catch(err =>
      console.error('[GoalDeadlineChecker] Startup check error:', err)
    );
  }, 10_000);

  // Then run every 24 hours
  intervalId = setInterval(() => {
    checkGoalDeadlines().catch(err =>
      console.error('[GoalDeadlineChecker] Unhandled error:', err)
    );
  }, TWENTY_FOUR_HOURS_MS);
}

export function stopGoalDeadlineChecker(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[GoalDeadlineChecker] Stopped');
  }
}
