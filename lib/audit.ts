import { prisma } from "@/lib/db";
import { Prisma, type AuditAction } from "@prisma/client";

type LogAuditInput = {
  actorId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  eventId?: string | null;
  diff?: Record<string, unknown> | null;
  message?: string;
};

export async function logAudit(input: LogAuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        eventId: input.eventId ?? null,
        diff: (input.diff ?? undefined) as Prisma.InputJsonValue | undefined,
        message: input.message ?? null,
      },
    });
  } catch (e) {
    // Audit must never crash the main flow
    console.error("[audit]", e);
  }
}

export function buildDiff<T extends Record<string, unknown>>(
  before: Partial<T>,
  after: Partial<T>,
): Record<string, { before: unknown; after: unknown }> | null {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changed: Record<string, { before: unknown; after: unknown }> = {};
  for (const k of keys) {
    if (before[k] !== after[k]) changed[k] = { before: before[k], after: after[k] };
  }
  return Object.keys(changed).length ? changed : null;
}
