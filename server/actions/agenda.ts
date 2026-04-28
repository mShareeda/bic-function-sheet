"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession, canEditEvent } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { notifyFunctionSheetUpdated } from "./events";

export type ActionResult = { ok: true } | { ok: false; error: string };

const agendaItemSchema = z.object({
  sequence: z.coerce.number().int().positive(),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  venueId: z.string().optional().or(z.literal("")),
  venueText: z.string().optional(),
  description: z.string().min(1),
  participants: z.coerce.number().int().optional().or(z.literal("")),
});

export async function upsertAgendaItemAction(eventId: string, formData: FormData): Promise<ActionResult> {
  const actor = await requireSession();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return { ok: false, error: "Event not found." };
  if (!canEditEvent(actor, event)) return { ok: false, error: "Not allowed." };

  const parsed = agendaItemSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const d = parsed.data;
  const existing = await prisma.agendaItem.findUnique({
    where: { eventId_sequence: { eventId, sequence: d.sequence } },
  });

  if (existing) {
    await prisma.agendaItem.update({
      where: { id: existing.id },
      data: {
        startTime: new Date(d.startTime),
        endTime: new Date(d.endTime),
        venueId: d.venueId || null,
        venueText: d.venueText || null,
        description: d.description,
        participants: d.participants ? Number(d.participants) : null,
      },
    });
    await logAudit({ actorId: actor.id, action: "UPDATE", entityType: "AgendaItem", entityId: existing.id, eventId });
  } else {
    const item = await prisma.agendaItem.create({
      data: {
        eventId,
        sequence: d.sequence,
        startTime: new Date(d.startTime),
        endTime: new Date(d.endTime),
        venueId: d.venueId || null,
        venueText: d.venueText || null,
        description: d.description,
        participants: d.participants ? Number(d.participants) : null,
      },
    });
    await logAudit({ actorId: actor.id, action: "CREATE", entityType: "AgendaItem", entityId: item.id, eventId });
  }

  if (event.functionSheetSentAt) {
    await notifyFunctionSheetUpdated(eventId, `Agenda updated by ${actor.displayName}`, actor.id);
  }

  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

export async function deleteAgendaItemAction(agendaItemId: string, eventId: string): Promise<ActionResult> {
  const actor = await requireSession();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return { ok: false, error: "Not found." };
  if (!canEditEvent(actor, event)) return { ok: false, error: "Not allowed." };

  await prisma.agendaItem.delete({ where: { id: agendaItemId } });
  await logAudit({ actorId: actor.id, action: "DELETE", entityType: "AgendaItem", entityId: agendaItemId, eventId });

  if (event.functionSheetSentAt) {
    await notifyFunctionSheetUpdated(eventId, `Agenda item removed by ${actor.displayName}`, actor.id);
  }

  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}
