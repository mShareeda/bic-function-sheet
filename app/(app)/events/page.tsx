import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canCreateEvent, isAdmin, hasRole } from "@/lib/authz";
import type { SessionUser } from "@/lib/authz";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  FUNCTION_SHEET_SENT: "bg-indigo-100 text-indigo-700",
  IN_SETUP: "bg-yellow-100 text-yellow-700",
  LIVE: "bg-green-100 text-green-700",
  CLOSED: "bg-gray-100 text-gray-600",
  ARCHIVED: "bg-gray-50 text-gray-400",
};

export default async function EventsPage() {
  const session = await auth();
  const u = session!.user as SessionUser;

  let where = {};
  if (isAdmin(u)) {
    where = {};
  } else if (hasRole(u, "COORDINATOR")) {
    where = { coordinatorId: u.id };
  } else if (hasRole(u, "DEPT_MANAGER")) {
    const memberships = await prisma.departmentMember.findMany({
      where: { userId: u.id, isManager: true },
      select: { departmentId: true },
    });
    where = { departments: { some: { departmentId: { in: memberships.map((m) => m.departmentId) } } } };
  } else {
    const assignments = await prisma.requirementAssignment.findMany({
      where: { userId: u.id },
      select: { requirement: { select: { eventId: true } } },
    });
    const ids = assignments.map((a) => a.requirement.eventId);
    where = { id: { in: ids } };
  }

  const events = await prisma.event.findMany({
    where,
    include: { coordinator: { select: { displayName: true } } },
    orderBy: { eventDate: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Events</h1>
        {canCreateEvent(u) && (
          <Button asChild size="sm">
            <Link href="/events/new">New event</Link>
          </Button>
        )}
      </div>
      {events.length === 0 && (
        <p className="text-muted-foreground">No events yet.</p>
      )}
      <div className="grid gap-3">
        {events.map((ev) => (
          <Link key={ev.id} href={`/events/${ev.id}`}>
            <Card className="hover:bg-muted/40 transition-colors cursor-pointer">
              <CardContent className="py-4 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{ev.title}</span>
                    {ev.isVip && <Badge variant="default" className="text-xs">VIP</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(ev.eventDate, "EEE d MMM yyyy")}
                    {ev.coordinator && ` · ${ev.coordinator.displayName}`}
                    {ev.maximizerNumber && ` · #${ev.maximizerNumber}`}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLOR[ev.status]}`}>
                  {ev.status.replace(/_/g, " ")}
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
