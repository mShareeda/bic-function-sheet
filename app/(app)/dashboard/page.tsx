import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAdmin, hasRole, canCreateEvent } from "@/lib/authz";
import type { SessionUser } from "@/lib/authz";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, addDays } from "date-fns";
import type { EventStatus } from "@prisma/client";

const STATUS_LABEL: Record<EventStatus, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  FUNCTION_SHEET_SENT: "Sheet Sent",
  IN_SETUP: "In Setup",
  LIVE: "Live",
  CLOSED: "Closed",
  ARCHIVED: "Archived",
};

const STATUS_COLOR: Record<EventStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  FUNCTION_SHEET_SENT: "bg-indigo-100 text-indigo-700",
  IN_SETUP: "bg-yellow-100 text-yellow-700",
  LIVE: "bg-green-100 text-green-700",
  CLOSED: "bg-gray-100 text-gray-600",
  ARCHIVED: "bg-gray-50 text-gray-400",
};

const ACTIVE_STATUSES: EventStatus[] = [
  "DRAFT",
  "CONFIRMED",
  "FUNCTION_SHEET_SENT",
  "IN_SETUP",
  "LIVE",
];

// ── Shared sub-components ────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function EventRow({
  id,
  title,
  eventDate,
  status,
  coordinator,
  guests,
}: {
  id: string;
  title: string;
  eventDate: Date;
  status: EventStatus;
  coordinator?: string | null;
  guests?: number | null;
}) {
  return (
    <Link href={`/events/${id}`} className="block">
      <div className="flex items-center gap-3 rounded-md border px-3 py-2.5 hover:bg-muted/40 transition-colors">
        <div className="w-10 shrink-0 text-center">
          <p className="text-[10px] text-muted-foreground uppercase leading-tight">
            {format(eventDate, "MMM")}
          </p>
          <p className="text-lg font-bold leading-none">{format(eventDate, "d")}</p>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{title}</p>
          <p className="text-xs text-muted-foreground truncate">
            {coordinator ?? "No coordinator"}
            {guests ? ` · ${guests} guests` : ""}
          </p>
        </div>
        <span
          className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLOR[status]}`}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>
    </Link>
  );
}

function RequirementRow({
  id,
  description,
  deptName,
  eventId,
  eventTitle,
  eventDate,
}: {
  id: string;
  description: string;
  deptName: string;
  eventId: string;
  eventTitle: string;
  eventDate: Date;
}) {
  return (
    <Link key={id} href={`/events/${eventId}`} className="block">
      <div className="rounded-md border px-3 py-2.5 hover:bg-muted/40 transition-colors">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm line-clamp-2 flex-1">{description}</p>
          <Badge variant="outline" className="text-xs shrink-0">
            {deptName}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {eventTitle} · {format(eventDate, "d MMM yyyy")}
        </p>
      </div>
    </Link>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await auth();
  const u = session!.user as SessionUser;

  const now = new Date();
  const in30 = addDays(now, 30);

  // ── ADMIN / COORDINATOR ──────────────────────────────────────────────────
  if (isAdmin(u) || hasRole(u, "COORDINATOR")) {
    const coordScope = isAdmin(u) ? {} : { coordinatorId: u.id };

    const [upcomingEvents, statusGroups, unassignedReqs, unreadCount] =
      await Promise.all([
        prisma.event.findMany({
          where: {
            ...coordScope,
            eventDate: { gte: now, lte: in30 },
            status: { in: ACTIVE_STATUSES },
          },
          include: { coordinator: { select: { displayName: true } } },
          orderBy: { eventDate: "asc" },
          take: 10,
        }),
        prisma.event.groupBy({
          by: ["status"],
          where: { ...coordScope, status: { in: ACTIVE_STATUSES } },
          _count: { _all: true },
          orderBy: { status: "asc" },
        }),
        prisma.departmentRequirement.findMany({
          where: {
            event: {
              ...coordScope,
              eventDate: { gte: now },
              status: { in: ACTIVE_STATUSES },
            },
            assignments: { none: {} },
          },
          include: {
            event: { select: { id: true, title: true, eventDate: true } },
            department: { select: { name: true } },
          },
          orderBy: { event: { eventDate: "asc" } },
          take: 10,
        }),
        prisma.notification.count({
          where: { userId: u.id, readAt: null },
        }),
      ]);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {u.displayName}</h1>
            <p className="text-sm text-muted-foreground">{u.roles.join(" · ")}</p>
          </div>
          {canCreateEvent(u) && (
            <Button asChild size="sm">
              <Link href="/events/new">New event</Link>
            </Button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Upcoming (30 days)"
            value={upcomingEvents.length}
            sub="Active events in the next 30 days"
          />
          <StatCard
            label="Unassigned requirements"
            value={unassignedReqs.length}
            sub="Upcoming requirements with no assignee"
          />
          <StatCard
            label="Unread notifications"
            value={unreadCount}
            sub="Items waiting for your attention"
          />
        </div>

        {statusGroups.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Events by status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {statusGroups.map((g) => (
                  <span
                    key={g.status}
                    className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full ${STATUS_COLOR[g.status]}`}
                  >
                    {STATUS_LABEL[g.status]}
                    <span className="font-bold">{g._count._all}</span>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Upcoming events</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/events">See all</Link>
                </Button>
              </div>
              <CardDescription>Next 30 days, active only</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming events.</p>
              ) : (
                upcomingEvents.map((ev) => (
                  <EventRow
                    key={ev.id}
                    id={ev.id}
                    title={ev.title}
                    eventDate={ev.eventDate}
                    status={ev.status}
                    coordinator={ev.coordinator?.displayName}
                    guests={ev.estimatedGuests}
                  />
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Requirements needing attention</CardTitle>
              <CardDescription>
                Upcoming events with unassigned requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {unassignedReqs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  All requirements are assigned.
                </p>
              ) : (
                unassignedReqs.map((req) => (
                  <RequirementRow
                    key={req.id}
                    id={req.id}
                    description={req.description}
                    deptName={req.department.name}
                    eventId={req.event.id}
                    eventTitle={req.event.title}
                    eventDate={req.event.eventDate}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── DEPT_MANAGER ─────────────────────────────────────────────────────────
  if (hasRole(u, "DEPT_MANAGER")) {
    const memberships = await prisma.departmentMember.findMany({
      where: { userId: u.id, isManager: true },
      include: { department: { select: { id: true, name: true } } },
    });
    const deptIds = memberships.map((m) => m.departmentId);
    const deptNames = memberships.map((m) => m.department.name);

    const [upcomingEvents, unassignedReqs, myAssignments] = await Promise.all([
      prisma.event.findMany({
        where: {
          eventDate: { gte: now, lte: in30 },
          status: { in: ACTIVE_STATUSES },
          departments: { some: { departmentId: { in: deptIds } } },
        },
        include: { coordinator: { select: { displayName: true } } },
        orderBy: { eventDate: "asc" },
        take: 10,
      }),
      prisma.departmentRequirement.findMany({
        where: {
          departmentId: { in: deptIds },
          event: {
            eventDate: { gte: now },
            status: { in: ACTIVE_STATUSES },
          },
          assignments: { none: {} },
        },
        include: {
          event: { select: { id: true, title: true, eventDate: true } },
          department: { select: { name: true } },
        },
        orderBy: { event: { eventDate: "asc" } },
        take: 10,
      }),
      prisma.requirementAssignment.findMany({
        where: {
          userId: u.id,
          requirement: {
            event: {
              eventDate: { gte: now },
              status: { in: ACTIVE_STATUSES },
            },
          },
        },
        include: {
          requirement: {
            include: {
              department: { select: { name: true } },
              event: { select: { id: true, title: true, eventDate: true } },
            },
          },
        },
        orderBy: { requirement: { event: { eventDate: "asc" } } },
        take: 10,
      }),
    ]);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {u.displayName}</h1>
          <p className="text-sm text-muted-foreground">
            Managing: {deptNames.join(", ")}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Upcoming events"
            value={upcomingEvents.length}
            sub="In your departments (next 30 days)"
          />
          <StatCard
            label="Unassigned requirements"
            value={unassignedReqs.length}
            sub="Needing a team member"
          />
          <StatCard
            label="My tasks"
            value={myAssignments.length}
            sub="Requirements assigned to you"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Upcoming events</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/events">See all</Link>
                </Button>
              </div>
              <CardDescription>Next 30 days in your departments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming events.</p>
              ) : (
                upcomingEvents.map((ev) => (
                  <EventRow
                    key={ev.id}
                    id={ev.id}
                    title={ev.title}
                    eventDate={ev.eventDate}
                    status={ev.status}
                    coordinator={ev.coordinator?.displayName}
                  />
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Unassigned requirements</CardTitle>
              <CardDescription>Items needing a team member</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {unassignedReqs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  All requirements are assigned.
                </p>
              ) : (
                unassignedReqs.map((req) => (
                  <RequirementRow
                    key={req.id}
                    id={req.id}
                    description={req.description}
                    deptName={req.department.name}
                    eventId={req.event.id}
                    eventTitle={req.event.title}
                    eventDate={req.event.eventDate}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {myAssignments.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">My assigned tasks</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/my-tasks">See all</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {myAssignments.map((a) => (
                <Link
                  key={a.requirementId}
                  href={`/events/${a.requirement.event.id}`}
                  className="block"
                >
                  <div className="flex items-start gap-3 rounded-md border px-3 py-2.5 hover:bg-muted/40 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-clamp-1">
                        {a.requirement.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {a.requirement.event.title} ·{" "}
                        {format(a.requirement.event.eventDate, "d MMM yyyy")}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {a.requirement.department.name}
                    </Badge>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ── DEPT_TEAM_MEMBER (or no role yet) ────────────────────────────────────
  const assignments = await prisma.requirementAssignment.findMany({
    where: {
      userId: u.id,
      requirement: {
        event: {
          eventDate: { gte: now },
          status: { in: ACTIVE_STATUSES },
        },
      },
    },
    include: {
      requirement: {
        include: {
          department: { select: { name: true } },
          event: {
            select: { id: true, title: true, eventDate: true, status: true },
          },
        },
      },
    },
    orderBy: { requirement: { event: { eventDate: "asc" } } },
  });

  const byEvent = new Map<string, typeof assignments>();
  for (const a of assignments) {
    const key = a.requirement.event.id;
    if (!byEvent.has(key)) byEvent.set(key, []);
    byEvent.get(key)!.push(a);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {u.displayName}</h1>
        <p className="text-sm text-muted-foreground">
          {u.roles.length > 0
            ? u.roles.join(" · ")
            : "No roles assigned — contact an admin"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Upcoming events"
          value={byEvent.size}
          sub="Events you have tasks in"
        />
        <StatCard
          label="Total tasks"
          value={assignments.length}
          sub="Requirements assigned to you"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">My upcoming tasks</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/my-tasks">See all</Link>
          </Button>
        </div>

        {byEvent.size === 0 ? (
          <p className="text-sm text-muted-foreground">
            No upcoming tasks assigned to you.
          </p>
        ) : (
          <div className="space-y-4">
            {[...byEvent.entries()].map(([, items]) => {
              const ev = items[0].requirement.event;
              return (
                <Card key={ev.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-base truncate">
                        {ev.title}
                      </CardTitle>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLOR[ev.status]}`}
                        >
                          {STATUS_LABEL[ev.status]}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(ev.eventDate, "d MMM yyyy")}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {items.map((a) => (
                      <Link
                        key={a.requirementId}
                        href={`/events/${ev.id}`}
                        className="block"
                      >
                        <div className="flex items-start gap-2 rounded-md border px-3 py-2 hover:bg-muted/40 transition-colors">
                          <p className="text-sm flex-1 line-clamp-2">
                            {a.requirement.description}
                          </p>
                          <div className="flex gap-1 shrink-0">
                            <Badge variant="outline" className="text-xs">
                              {a.requirement.department.name}
                            </Badge>
                            {a.requirement.priority && (
                              <Badge variant="secondary" className="text-xs">
                                {a.requirement.priority}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
