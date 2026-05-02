import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAdmin, hasRole, canCreateEvent } from "@/lib/authz";
import type { SessionUser } from "@/lib/authz";
import { CalendarTabs } from "@/components/calendar/calendar-tabs";

export default async function CalendarPage() {
  const session = await auth();
  const u = session!.user as SessionUser;

  let where = {};
  if (!isAdmin(u)) {
    if (hasRole(u, "COORDINATOR")) {
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
      where = { id: { in: assignments.map((a) => a.requirement.eventId) } };
    }
  }

  const events = await prisma.event.findMany({
    where,
    select: {
      id: true,
      title: true,
      status: true,
      isVip: true,
      // All three phases — used by both the FullCalendar and the Gantt view
      setupStart: true,
      setupEnd: true,
      liveStart: true,
      liveEnd: true,
      breakdownStart: true,
      breakdownEnd: true,
      coordinator: { select: { displayName: true } },
    },
    orderBy: { liveStart: "asc" },
  });

  // ── FullCalendar event shape ─────────────────────────────────────────────
  const calEvents = events.map((ev) => ({
    id: ev.id,
    title: ev.title + (ev.isVip ? " ★" : ""),
    start: ev.liveStart.toISOString(),
    end: ev.liveEnd.toISOString(),
    url: `/events/${ev.id}`,
    extendedProps: { status: ev.status, isVip: ev.isVip },
    classNames: [`status-${ev.status.toLowerCase()}`, ev.isVip ? "vip-event" : ""],
  }));

  // ── Timeline / Gantt event shape ─────────────────────────────────────────
  const timelineEvents = events.map((ev) => ({
    id: ev.id,
    title: ev.title,
    status: ev.status as string,
    isVip: ev.isVip,
    setupStart: ev.setupStart.toISOString(),
    setupEnd: ev.setupEnd.toISOString(),
    liveStart: ev.liveStart.toISOString(),
    liveEnd: ev.liveEnd.toISOString(),
    breakdownStart: ev.breakdownStart.toISOString(),
    breakdownEnd: ev.breakdownEnd.toISOString(),
    coordinator: ev.coordinator?.displayName ?? undefined,
    url: `/events/${ev.id}`,
  }));

  const canCreate = canCreateEvent(u);

  // Fetch coordinators for the quick-create dialog (only when user can create)
  const coordinators = canCreate
    ? await prisma.userRole.findMany({
        where: { role: "COORDINATOR" },
        select: { user: { select: { id: true, displayName: true } } },
      }).then((rows) => rows.map((r) => r.user))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Schedule
        </p>
        <h1 className="mt-1 text-display">Calendar</h1>
        <p className="text-sm text-muted-foreground">
          {events.length} event{events.length === 1 ? "" : "s"} visible to you
        </p>
      </div>

      <CalendarTabs calEvents={calEvents} timelineEvents={timelineEvents} canCreate={canCreate} coordinators={coordinators} />
    </div>
  );
}
