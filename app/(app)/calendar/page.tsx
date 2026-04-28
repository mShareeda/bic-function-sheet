import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAdmin, hasRole } from "@/lib/authz";
import type { SessionUser } from "@/lib/authz";
import { CalendarView } from "@/components/calendar/calendar-view";

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
      id: true, title: true, liveStart: true, liveEnd: true,
      status: true, isVip: true,
      coordinator: { select: { displayName: true } },
    },
    orderBy: { liveStart: "asc" },
  });

  const calEvents = events.map((ev) => ({
    id: ev.id,
    title: ev.title + (ev.isVip ? " ★" : ""),
    start: ev.liveStart.toISOString(),
    end: ev.liveEnd.toISOString(),
    url: `/events/${ev.id}`,
    extendedProps: { status: ev.status, isVip: ev.isVip },
    classNames: [
      `status-${ev.status.toLowerCase()}`,
      ev.isVip ? "vip-event" : "",
    ],
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Calendar</h1>
      <CalendarView events={calEvents} />
    </div>
  );
}
