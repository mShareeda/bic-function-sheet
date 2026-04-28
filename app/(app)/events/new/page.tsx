import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canCreateEvent } from "@/lib/authz";
import type { SessionUser } from "@/lib/authz";
import { EventForm } from "@/components/events/event-form";

export default async function NewEventPage() {
  const session = await auth();
  const u = session!.user as SessionUser;
  if (!canCreateEvent(u)) redirect("/events");

  const coordinators = await prisma.user.findMany({
    where: { isActive: true, roles: { some: { role: "COORDINATOR" } } },
    select: { id: true, displayName: true },
    orderBy: { displayName: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">New event</h1>
      <EventForm coordinators={coordinators} />
    </div>
  );
}
