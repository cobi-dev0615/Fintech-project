import { db } from '../db/connection.js';

export type NotificationType = 
  | 'account_activity'
  | 'transaction_alert'
  | 'investment_update'
  | 'report_ready'
  | 'message_received'
  | 'consultant_assignment'
  | 'consultant_invitation'
  | 'subscription_update'
  | 'system_announcement'
  | 'goal_milestone'
  | 'connection_status';

export interface CreateAlertParams {
  userId: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  notificationType: NotificationType;
  linkUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * Check if a user has enabled notifications for a specific type
 */
export async function isNotificationEnabled(
  userId: string,
  notificationType: NotificationType
): Promise<boolean> {
  try {
    // Check if preferences table exists
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_notification_preferences'
      );
    `);

    if (!tableExists.rows[0]?.exists) {
      // If table doesn't exist, default to enabled
      return true;
    }

    // Check user's preference for this notification type
    const result = await db.query(
      `SELECT enabled FROM user_notification_preferences 
       WHERE user_id = $1 AND notification_type = $2`,
      [userId, notificationType]
    );

    // If no preference exists, default to enabled
    if (result.rows.length === 0) {
      return true;
    }

    return result.rows[0].enabled === true;
  } catch (error) {
    console.error('Error checking notification preference:', error);
    // On error, default to enabled to ensure important notifications aren't missed
    return true;
  }
}

/**
 * Create an alert/notification for a user, respecting their preferences
 */
export async function createAlert(params: CreateAlertParams): Promise<string | null> {
  try {
    const { userId, notificationType, ...alertParams } = params;

    // Check if user has enabled this notification type
    const isEnabled = await isNotificationEnabled(userId, notificationType);

    if (!isEnabled) {
      console.log(`Notification skipped for user ${userId}, type ${notificationType} is disabled`);
      return null;
    }

    // Check if alerts table exists
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'alerts'
      );
    `);

    if (!tableExists.rows[0]?.exists) {
      console.warn('Alerts table does not exist, skipping notification creation');
      return null;
    }

    // Insert the alert
    const result = await db.query(
      `INSERT INTO alerts (user_id, severity, title, message, notification_type, link_url, metadata_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        userId,
        alertParams.severity,
        alertParams.title,
        alertParams.message,
        notificationType,
        alertParams.linkUrl || null,
        JSON.stringify(alertParams.metadata || {}),
      ]
    );

    return result.rows[0]?.id || null;
  } catch (error) {
    console.error('Error creating alert:', error);
    return null;
  }
}

/**
 * Create alerts for multiple users, respecting each user's preferences
 */
export async function createAlertsForUsers(
  userIds: string[],
  params: Omit<CreateAlertParams, 'userId'>
): Promise<number> {
  let createdCount = 0;

  for (const userId of userIds) {
    const alertId = await createAlert({
      ...params,
      userId,
    });

    if (alertId) {
      createdCount++;
    }
  }

  return createdCount;
}

/**
 * Get user's notification preferences
 */
export async function getUserNotificationPreferences(userId: string): Promise<Record<NotificationType, {
  enabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
}>> {
  try {
    // Check if preferences table exists
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_notification_preferences'
      );
    `);

    if (!tableExists.rows[0]?.exists) {
      // Return default preferences (all enabled)
      const defaultPrefs: Record<NotificationType, { enabled: boolean; emailEnabled: boolean; pushEnabled: boolean }> = {
        account_activity: { enabled: true, emailEnabled: true, pushEnabled: true },
        transaction_alert: { enabled: true, emailEnabled: true, pushEnabled: true },
        investment_update: { enabled: true, emailEnabled: true, pushEnabled: true },
        report_ready: { enabled: true, emailEnabled: true, pushEnabled: true },
        message_received: { enabled: true, emailEnabled: true, pushEnabled: true },
        consultant_assignment: { enabled: true, emailEnabled: true, pushEnabled: true },
        consultant_invitation: { enabled: true, emailEnabled: true, pushEnabled: true },
        subscription_update: { enabled: true, emailEnabled: true, pushEnabled: true },
        system_announcement: { enabled: true, emailEnabled: true, pushEnabled: true },
        goal_milestone: { enabled: true, emailEnabled: true, pushEnabled: true },
        connection_status: { enabled: true, emailEnabled: true, pushEnabled: true },
      };
      return defaultPrefs;
    }

    // Get user's preferences
    const result = await db.query(
      `SELECT notification_type, enabled, email_enabled, push_enabled
       FROM user_notification_preferences
       WHERE user_id = $1`,
      [userId]
    );

    // Build preferences object with defaults
    const allTypes: NotificationType[] = [
      'account_activity',
      'transaction_alert',
      'investment_update',
      'report_ready',
      'message_received',
      'consultant_assignment',
      'consultant_invitation',
      'subscription_update',
      'system_announcement',
      'goal_milestone',
      'connection_status',
    ];

    const preferences: Record<string, { enabled: boolean; emailEnabled: boolean; pushEnabled: boolean }> = {};

    // Initialize all types with defaults
    for (const type of allTypes) {
      preferences[type] = { enabled: true, emailEnabled: true, pushEnabled: true };
    }

    // Override with user's actual preferences
    for (const row of result.rows) {
      preferences[row.notification_type] = {
        enabled: row.enabled === true,
        emailEnabled: row.email_enabled === true,
        pushEnabled: row.push_enabled === true,
      };
    }

    return preferences as Record<NotificationType, { enabled: boolean; emailEnabled: boolean; pushEnabled: boolean }>;
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    // Return defaults on error
    const defaultPrefs: Record<NotificationType, { enabled: boolean; emailEnabled: boolean; pushEnabled: boolean }> = {
      account_activity: { enabled: true, emailEnabled: true, pushEnabled: true },
      transaction_alert: { enabled: true, emailEnabled: true, pushEnabled: true },
      investment_update: { enabled: true, emailEnabled: true, pushEnabled: true },
      report_ready: { enabled: true, emailEnabled: true, pushEnabled: true },
      message_received: { enabled: true, emailEnabled: true, pushEnabled: true },
      consultant_assignment: { enabled: true, emailEnabled: true, pushEnabled: true },
      consultant_invitation: { enabled: true, emailEnabled: true, pushEnabled: true },
      subscription_update: { enabled: true, emailEnabled: true, pushEnabled: true },
      system_announcement: { enabled: true, emailEnabled: true, pushEnabled: true },
      goal_milestone: { enabled: true, emailEnabled: true, pushEnabled: true },
      connection_status: { enabled: true, emailEnabled: true, pushEnabled: true },
    };
    return defaultPrefs;
  }
}

/**
 * Update user's notification preferences
 */
export async function updateUserNotificationPreferences(
  userId: string,
  notificationType: NotificationType,
  preferences: {
    enabled?: boolean;
    emailEnabled?: boolean;
    pushEnabled?: boolean;
  }
): Promise<void> {
  try {
    // Check if preferences table exists
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_notification_preferences'
      );
    `);

    if (!tableExists.rows[0]?.exists) {
      throw new Error('Notification preferences table does not exist');
    }

    // Upsert preference
    await db.query(
      `INSERT INTO user_notification_preferences (user_id, notification_type, enabled, email_enabled, push_enabled)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, notification_type)
       DO UPDATE SET
         enabled = COALESCE(EXCLUDED.enabled, user_notification_preferences.enabled),
         email_enabled = COALESCE(EXCLUDED.email_enabled, user_notification_preferences.email_enabled),
         push_enabled = COALESCE(EXCLUDED.push_enabled, user_notification_preferences.push_enabled),
         updated_at = NOW()`,
      [
        userId,
        notificationType,
        preferences.enabled !== undefined ? preferences.enabled : true,
        preferences.emailEnabled !== undefined ? preferences.emailEnabled : true,
        preferences.pushEnabled !== undefined ? preferences.pushEnabled : true,
      ]
    );
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    throw error;
  }
}
