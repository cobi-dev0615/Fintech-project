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
    await db.query(
      `INSERT INTO audit_logs (
        admin_id, action, resource_type, resource_id,
        old_value, new_value, ip_address, user_agent, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        entry.adminId,
        entry.action,
        entry.resourceType,
        entry.resourceId || null,
        entry.oldValue ? JSON.stringify(entry.oldValue) : null,
        entry.newValue ? JSON.stringify(entry.newValue) : null,
        entry.ipAddress || null,
        entry.userAgent || null,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
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

