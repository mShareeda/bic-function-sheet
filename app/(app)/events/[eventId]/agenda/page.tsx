import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditEvent } from "@/lib/authz";
import type { SessionUser } from "@/lib/authz";
import { AgendaEditor } from "@/components/events/agenda-editor";

export default async function AgendaPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const session = await auth();
  const u = session!.user as SessionUser;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      agendaItems: { include: { venue: true }, orderBy: { sequence: "asc" } },
    },
  });
  if (!event) notFound();
  if (!canEditEvent(u, event)) redirect(`/events/${eventId}`);

  const venues = await prisma.venue.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Agenda</h1>
        <p className="text-sm text-muted-foreground">{event.title}</p>
      </div>
      <AgendaEditor eventId={eventId} agendaItems={event.agendaItems} venues={venues} />
    </div>
  );
}
