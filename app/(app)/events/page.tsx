import Link from "next/link";
import { Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canCreateEvent, isAdmin, hasRole } from "@/lib/authz";
import type { SessionUser } from "@/lib/authz";
import { Button } from "@/components/ui/button";
import { EventsListClient } from "@/components/events/events-list-client";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  const u = session!.user as SessionUser;
  const { status: initialStatus } = await searchParams;

  let where = {};
  if (isAdmin(u)) {
    where = {};
  } else if (hasRole(u, "COORDINATOR")) {
    where = { coordinatorId: u.id };
  } else if (hasRole(u, "DEPT_MANAGER")) {
    where = {};
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

  const items = events.map((ev) => ({
    id: ev.id,
    title: ev.title,
    eventDate: ev.eventDate.toISOString(),
    status: ev.status,
    isVip: ev.isVip,
    coordinator: ev.coordinator?.displayName ?? null,
    maximizerNumber: ev.maximizerNumber ?? null,
    estimatedGuests: ev.estimatedGuests ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Function sheets
          </p>
          <h1 className="mt-1 text-display">Events</h1>
          <p className="text-sm text-muted-foreground">
            Showing the most recent {events.length} events accessible to you.
          </p>
        </div>
        {canCreateEvent(u) && (
          <Button asChild size="sm">
            <Link href="/events/new">
              <Plus className="h-4 w-4" />
              New event
            </Link>
          </Button>
        )}
      </div>

      <EventsListClient events={items} initialStatus={initialStatus} />
    </div>
  );
}
