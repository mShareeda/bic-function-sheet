import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/authz";
import type { SessionUser } from "@/lib/authz";
import { AuditEventList } from "@/components/admin/audit-event-list";
import { formatDistanceToNow } from "date-fns";
import type { AuditAction } from "@prisma/client";

export type AuditEntry = {
  id: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  message: string | null;
  createdAt: string;
  actorName: string | null;
};

export type AuditEventGroup = {
  eventId: string;
  eventTitle: string;
  maximizerNumber: string | null;
  latestAt: string;
  entries: AuditEntry[];
};

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  const u = session!.user as SessionUser;
  if (!isAdmin(u)) redirect("/dashboard");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1"));
  const PAGE_SIZE = 20;

  // Fetch events that have audit log entries, ordered by most recent activity
  const eventsWithLogs = await prisma.event.findMany({
    where: { auditLogs: { some: {} } },
    select: {
      id: true,
      title: true,
      maximizerNumber: true,
      auditLogs: {
        include: { actor: { select: { displayName: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { updatedAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const totalEvents = await prisma.event.count({
    where: { auditLogs: { some: {} } },
  });

  // Also fetch system/non-event audit entries on page 1
  const systemEntries =
    page === 1
      ? await prisma.auditLog.findMany({
          where: { eventId: null },
          include: { actor: { select: { displayName: true } } },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      : [];

  const eventGroups: AuditEventGroup[] = eventsWithLogs.map((ev) => ({
    eventId: ev.id,
    eventTitle: ev.title,
    maximizerNumber: ev.maximizerNumber,
    latestAt: ev.auditLogs[0]?.createdAt.toISOString() ?? new Date().toISOString(),
    entries: ev.auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      message: log.message,
      createdAt: log.createdAt.toISOString(),
      actorName: log.actor?.displayName ?? null,
    })),
  }));

  const systemAuditEntries: AuditEntry[] = systemEntries.map((log) => ({
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    message: log.message,
    createdAt: log.createdAt.toISOString(),
    actorName: log.actor?.displayName ?? null,
  }));

  const totalPages = Math.ceil(totalEvents / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Admin
        </p>
        <h1 className="mt-1 text-display">Audit log</h1>
        <p className="text-sm text-muted-foreground">
          {totalEvents} event{totalEvents !== 1 ? "s" : ""} with activity
        </p>
      </div>

      <AuditEventList
        eventGroups={eventGroups}
        systemEntries={page === 1 ? systemAuditEntries : []}
      />

      {totalPages > 1 && (
        <div className="flex gap-4 text-sm items-center">
          {page > 1 && (
            <a href={`?page=${page - 1}`} className="underline">← Prev</a>
          )}
          <span className="text-muted-foreground">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <a href={`?page=${page + 1}`} className="underline">Next →</a>
          )}
        </div>
      )}
    </div>
  );
}
