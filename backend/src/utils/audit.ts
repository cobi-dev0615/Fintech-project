import { db } from '../db/connection.js';

export interface AuditLogEntry {
  adminId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}

export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    // Build metadata object with all additional information
    const metadata: any = {};
    if (entry.oldValue) metadata.oldValue = entry.oldValue;
    if (entry.newValue) metadata.newValue = entry.newValue;
    if (entry.ipAddress) metadata.ipAddress = entry.ipAddress;
    if (entry.userAgent) metadata.userAgent = entry.userAgent;
    if (entry.metadata) {
      // Merge any additional metadata
      Object.assign(metadata, entry.metadata);
    }

    await db.query(
      `INSERT INTO audit_logs (
        actor_user_id, action, entity_type, entity_id, metadata_json
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        entry.adminId,
        entry.action,
        entry.resourceType,
        entry.resourceId || null, // Will be null for bulk operations
        JSON.stringify(metadata),
      ]
    );
  } catch (error: any) {
    // Log error but don't throw - audit logging shouldn't break the main flow
    console.error('Failed to log audit:', error);
  }
}

// Helper function to get IP address from Fastify request
export function getClientIp(request: any): string | undefined {
  return request.ip || 
         request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         request.headers['x-real-ip'] ||
         request.socket?.remoteAddress;
}

