import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canViewEventAudit } from "@/lib/authz";
import type { SessionUser } from "@/lib/authz";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export default async function EventAuditPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const session = await auth();
  const u = session!.user as SessionUser;

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) notFound();
  if (!canViewEventAudit(u, event)) redirect(`/events/${eventId}`);

  const logs = await prisma.auditLog.findMany({
    where: { eventId },
    include: { actor: { select: { displayName: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit log</h1>
        <p className="text-sm text-muted-foreground">{event.title}</p>
      </div>
      <div className="space-y-2">
        {logs.map((log) => (
          <Card key={log.id}>
            <CardContent className="py-3 flex flex-wrap items-start gap-3 text-sm">
              <Badge variant="outline">{log.action}</Badge>
              <span className="font-medium">{log.entityType}</span>
              {log.message && <span className="text-muted-foreground">{log.message}</span>}
              <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
                {log.actor?.displayName ?? "system"} · {formatDistanceToNow(log.createdAt, { addSuffix: true })}
              </span>
            </CardContent>
          </Card>
        ))}
        {logs.length === 0 && <p className="text-muted-foreground">No activity logged yet.</p>}
      </div>
    </div>
  );
}
