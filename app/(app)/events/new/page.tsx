import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canCreateEvent } from "@/lib/authz";
import type { SessionUser } from "@/lib/authz";
import { EventWizard } from "@/components/events/event-wizard";

export default async function NewEventPage() {
  const session = await auth();
  const u = session!.user as SessionUser;
  if (!canCreateEvent(u)) redirect("/events");

  const [coordinators, venues, departments] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true, roles: { some: { role: "COORDINATOR" } } },
      select: { id: true, displayName: true },
      orderBy: { displayName: "asc" },
    }),
    prisma.venue.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Function sheets
        </p>
        <h1 className="mt-1 text-display">New event</h1>
        <p className="text-sm text-muted-foreground">
          Walk through the steps to set up an event and publish its function
          sheet.
        </p>
      </div>
      <EventWizard
        coordinators={coordinators}
        venues={venues}
        departments={departments}
      />
    </div>
  );
}
