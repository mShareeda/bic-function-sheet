"use server";

// ── Event template server actions ─────────────────────────────────────────────
// Templates are reusable scaffolds (departments + requirements + agenda stubs)
// that coordinators can instantiate into a full event by supplying the dates.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, canCreateEvent, isAdmin } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

// ── Zod schemas ───────────────────────────────────────────────────────────────

const agendaItemSchema = z.object({
  sequence: z.number().int().positive(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "HH:mm"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "HH:mm"),
  description: z.string().min(1),
  venueText: z.string().nullable().optional(),
});

const departmentSchema = z.object({
  departmentId: z.string().min(1),
  departmentName: z.string().min(1),
  requirements: z.string().optional(),
});

const templateSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional(),
  eventType: z.string().optional(),
  isVip: z.boolean().optional(),
  estimatedGuests: z.number().int().nullable().optional(),
  salespersonName: z.string().optional(),
  agendaItems: z.array(agendaItemSchema),
  departments: z.array(departmentSchema),
});

export type TemplatePayload = z.infer<typeof templateSchema>;

// ── Types for safe JSON parsing ───────────────────────────────────────────────

export type TemplateDept = {
  departmentId: string;
  departmentName: string;
  requirements?: string;
};

export type TemplateAgendaItem = {
  sequence: number;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  description: string;
  venueText?: string | null;
};

export type TemplateRecord = {
  id: string;
  title: string;
  description: string | null;
  eventType: string | null;
  isVip: boolean;
  estimatedGuests: number | null;
  salespersonName: string | null;
  departments: TemplateDept[];
  agendaItems: TemplateAgendaItem[];
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
};

function parseTemplateDepts(raw: unknown): TemplateDept[] {
  if (!Array.isArray(raw)) return [];
  return raw as TemplateDept[];
}

function parseTemplateAgenda(raw: unknown): TemplateAgendaItem[] {
  if (!Array.isArray(raw)) return [];
  return raw as TemplateAgendaItem[];
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getTemplatesAction(): Promise<
  { ok: true; templates: TemplateRecord[] } | { ok: false; error: string }
> {
  const actor = await requireSession();
  if (!canCreateEvent(actor)) return { ok: false, error: "Not allowed." };

  const rows = await prisma.eventTemplate.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return {
    ok: true,
    templates: rows.map((r) => ({
      ...r,
      departments: parseTemplateDepts(r.departments),
      agendaItems: parseTemplateAgenda(r.agendaItems),
    })),
  };
}

export async function getTemplateAction(
  id: string,
): Promise<{ ok: true; template: TemplateRecord } | { ok: false; error: string }> {
  const actor = await requireSession();
  if (!canCreateEvent(actor)) return { ok: false, error: "Not allowed." };

  const row = await prisma.eventTemplate.findUnique({ where: { id } });
  if (!row) return { ok: false, error: "Not found." };

  return {
    ok: true,
    template: {
      ...row,
      departments: parseTemplateDepts(row.departments),
      agendaItems: parseTemplateAgenda(row.agendaItems),
    },
  };
}

// ── Write ─────────────────────────────────────────────────────────────────────

export async function createTemplateAction(
  payload: TemplatePayload,
): Promise<ActionResult> {
  const actor = await requireSession();
  if (!canCreateEvent(actor)) return { ok: false, error: "Not allowed." };

  const parsed = templateSchema.safeParse(payload);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const d = parsed.data;

  const tmpl = await prisma.eventTemplate.create({
    data: {
      title: d.title,
      description: d.description || null,
      eventType: d.eventType || null,
      isVip: !!d.isVip,
      estimatedGuests: d.estimatedGuests ?? null,
      salespersonName: d.salespersonName || null,
      departments: d.departments as object[],
      agendaItems: d.agendaItems as object[],
      createdById: actor.id,
    },
  });

  await logAudit({
    actorId: actor.id,
    action: "CREATE",
    entityType: "EventTemplate",
    entityId: tmpl.id,
  });

  revalidatePath("/recurring");
  return { ok: true, id: tmpl.id };
}

export async function updateTemplateAction(
  id: string,
  payload: TemplatePayload,
): Promise<ActionResult> {
  const actor = await requireSession();
  if (!canCreateEvent(actor)) return { ok: false, error: "Not allowed." };

  const row = await prisma.eventTemplate.findUnique({ where: { id } });
  if (!row) return { ok: false, error: "Not found." };
  // Only creator or admin can edit
  if (row.createdById !== actor.id && !isAdmin(actor))
    return { ok: false, error: "Not allowed." };

  const parsed = templateSchema.safeParse(payload);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const d = parsed.data;

  await prisma.eventTemplate.update({
    where: { id },
    data: {
      title: d.title,
      description: d.description || null,
      eventType: d.eventType || null,
      isVip: !!d.isVip,
      estimatedGuests: d.estimatedGuests ?? null,
      salespersonName: d.salespersonName || null,
      departments: d.departments as object[],
      agendaItems: d.agendaItems as object[],
    },
  });

  await logAudit({
    actorId: actor.id,
    action: "UPDATE",
    entityType: "EventTemplate",
    entityId: id,
  });

  revalidatePath("/recurring");
  revalidatePath(`/recurring/${id}`);
  return { ok: true };
}

export async function deleteTemplateAction(id: string): Promise<ActionResult> {
  const actor = await requireSession();
  if (!canCreateEvent(actor)) return { ok: false, error: "Not allowed." };

  const row = await prisma.eventTemplate.findUnique({ where: { id } });
  if (!row) return { ok: false, error: "Not found." };
  if (row.createdById !== actor.id && !isAdmin(actor))
    return { ok: false, error: "Not allowed." };

  await prisma.eventTemplate.delete({ where: { id } });
  await logAudit({
    actorId: actor.id,
    action: "DELETE",
    entityType: "EventTemplate",
    entityId: id,
  });

  revalidatePath("/recurring");
  redirect("/recurring");
}

// ── Instantiate: create an event from a template ──────────────────────────────

const instantiateSchema = z.object({
  templateId: z.string().min(1),
  title: z.string().min(2),
  eventDate: z.string().min(1),
  coordinatorId: z.string().optional(),
  clientName: z.string().optional(),
  clientContact: z.string().optional(),
  setupStart: z.string().min(1),   // full ISO or "HH:mm"
  setupEnd: z.string().min(1),
  liveStart: z.string().min(1),
  liveEnd: z.string().min(1),
  breakdownStart: z.string().min(1),
  breakdownEnd: z.string().min(1),
});

export type InstantiatePayload = z.infer<typeof instantiateSchema>;

/**
 * Combine an event date (YYYY-MM-DD) with a time string (HH:mm or ISO).
 * If the time is already a full ISO string, use it directly.
 */
function combineDateTime(dateStr: string, timeStr: string): Date {
  if (timeStr.includes("T") || timeStr.length > 5) {
    return new Date(timeStr);
  }
  return new Date(`${dateStr}T${timeStr}:00`);
}

export async function createEventFromTemplateAction(
  payload: InstantiatePayload,
): Promise<ActionResult> {
  const actor = await requireSession();
  if (!canCreateEvent(actor)) return { ok: false, error: "Not allowed." };

  const parsed = instantiateSchema.safeParse(payload);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const d = parsed.data;

  const tmpl = await prisma.eventTemplate.findUnique({ where: { id: d.templateId } });
  if (!tmpl) return { ok: false, error: "Template not found." };

  const depts = parseTemplateDepts(tmpl.departments);
  const agendaItems = parseTemplateAgenda(tmpl.agendaItems);

  // Extract date portion from eventDate for combining with HH:mm times
  const datePart = new Date(d.eventDate).toISOString().slice(0, 10);

  const event = await prisma.$transaction(async (tx) => {
    const created = await tx.event.create({
      data: {
        title: d.title,
        eventDate: new Date(d.eventDate),
        coordinatorId: d.coordinatorId || null,
        salespersonName: tmpl.salespersonName || null,
        isVip: tmpl.isVip,
        estimatedGuests: tmpl.estimatedGuests ?? null,
        clientName: d.clientName || null,
        clientContact: d.clientContact || null,
        setupStart: combineDateTime(datePart, d.setupStart),
        setupEnd: combineDateTime(datePart, d.setupEnd),
        liveStart: combineDateTime(datePart, d.liveStart),
        liveEnd: combineDateTime(datePart, d.liveEnd),
        breakdownStart: combineDateTime(datePart, d.breakdownStart),
        breakdownEnd: combineDateTime(datePart, d.breakdownEnd),
        createdById: actor.id,
      },
    });

    // Pre-populate agenda from template
    if (agendaItems.length > 0) {
      await tx.agendaItem.createMany({
        data: agendaItems.map((a) => ({
          eventId: created.id,
          sequence: a.sequence,
          startTime: combineDateTime(datePart, a.startTime),
          endTime: combineDateTime(datePart, a.endTime),
          venueText: a.venueText ?? null,
          description: a.description,
        })),
      });
    }

    // Pre-populate departments + requirements from template
    for (const dept of depts) {
      const ed = await tx.eventDepartment.create({
        data: { eventId: created.id, departmentId: dept.departmentId },
      });
      const reqText = dept.requirements?.trim();
      if (reqText) {
        await tx.departmentRequirement.create({
          data: {
            eventId: created.id,
            departmentId: dept.departmentId,
            eventDepartmentId: ed.id,
            description: reqText,
            sortOrder: 0,
            updatedById: actor.id,
          },
        });
      }
    }

    return created;
  });

  await logAudit({
    actorId: actor.id,
    action: "CREATE",
    entityType: "Event",
    entityId: event.id,
    eventId: event.id,
    message: `Created from template: ${tmpl.title}`,
  });

  return { ok: true, id: event.id };
}
