import { prisma } from './prisma';

interface AuditParams {
  entityName: string;
  entityId: string;
  action: string;
  changesJson: Record<string, any> | string;
  userId?: string | null;
}

/**
 * Registra uma ação administrativa na tabela AuditLog.
 */
export async function logAuditEvent({
  entityName,
  entityId,
  action,
  changesJson,
  userId,
}: AuditParams) {
  try {
    const serialized = typeof changesJson === 'string' ? changesJson : JSON.stringify(changesJson);
    await prisma.auditLog.create({
      data: {
        entityName,
        entityId,
        action,
        changesJson: serialized,
        userId: userId || null,
      },
    });
  } catch (error) {
    console.error('[AuditLog] Falha ao registrar log de auditoria:', error);
  }
}
