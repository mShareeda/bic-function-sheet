"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, canEditEvent, canCreateEvent, isAdmin } from "@/lib/authz";
import { logAudit, buildDiff } from "@/lib/audit";
import { notify } from "@/lib/notifications";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

const eventSchema = z.object({
  title: z.string().min(2),
  eventDate: z.string().datetime({ offset: true }).or(z.string().date()),
  confirmationReceived: z.string().datetime({ offset: true }).or(z.string().date()).optional().or(z.literal("")),
  coordinatorId: z.string().cuid().optional().or(z.literal("")),
  salespersonName: z.string().optional(),
  maximizerNumber: z.string().optional(),
  isVip: z.string().optional(),
  estimatedGuests: z.string().optional(),
  clientName: z.string().optional(),
  clientContact: z.string().optional(),
  setupStart: z.string().datetime({ offset: true }).or(z.string()),
  setupEnd: z.string().datetime({ offset: true }).or(z.string()),
  liveStart: z.string().datetime({ offset: true }).or(z.string()),
  liveEnd: z.string().datetime({ offset: true }).or(z.string()),
  breakdownStart: z.string().datetime({ offset: true }).or(z.string()),
  breakdownEnd: z.string().datetime({ offset: true }).or(z.string()),
});

function parseDate(s: string | undefined) {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

export async function createEventAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireSession();
  if (!canCreateEvent(actor)) return { ok: false, error: "Not allowed." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = eventSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const d = parsed.data;
  const coordId = d.coordinatorId || null;

  const event = await prisma.event.create({
    data: {
      title: d.title,
      eventDate: new Date(d.eventDate),
      confirmationReceived: d.confirmationReceived ? new Date(d.confirmationReceived) : null,
      coordinatorId: coordId,
      salespersonName: d.salespersonName || null,
      maximizerNumber: d.maximizerNumber || null,
      isVip: d.isVip === "true" || d.isVip === "on",
      estimatedGuests: d.estimatedGuests ? parseInt(d.estimatedGuests) : null,
      clientName: d.clientName || null,
      clientContact: d.clientContact || null,
      setupStart: new Date(d.setupStart),
      setupEnd: new Date(d.setupEnd),
      liveStart: new Date(d.liveStart),
      liveEnd: new Date(d.liveEnd),
      breakdownStart: new Date(d.breakdownStart),
      breakdownEnd: new Date(d.breakdownEnd),
      createdById: actor.id,
    },
  });

  await logAudit({ actorId: actor.id, action: "CREATE", entityType: "Event", entityId: event.id, eventId: event.id });

  if (coordId && coordId !== actor.id) {
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    await notify({
      userIds: [coordId],
      type: "EVENT_ASSIGNED",
      title: `You've been assigned as coordinator for: ${event.title}`,
      body: `Event date: ${new Date(event.eventDate).toLocaleDateString()}`,
      eventId: event.id,
      url: `${appUrl}/events/${event.id}`,
      sendEmail: true,
      emailSubject: `[BIC] You're the coordinator for: ${event.title}`,
      emailText: `You've been assigned as event coordinator for "${event.title}" on ${new Date(event.eventDate).toLocaleDateString()}.\n\nView it: ${appUrl}/events/${event.id}`,
      emailHtml: `<p>You've been assigned as event coordinator for <strong>${event.title}</strong> on ${new Date(event.eventDate).toLocaleDateString()}.</p><p><a href="${appUrl}/events/${event.id}">View the event</a></p>`,
    });
  }

  redirect(`/events/${event.id}`);
}

export async function updateEventAction(eventId: string, formData: FormData): Promise<ActionResult> {
  const actor = await requireSession();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return { ok: false, error: "Not found." };
  if (!canEditEvent(actor, event)) return { ok: false, error: "Not allowed." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = eventSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const d = parsed.data;
  const coordId = d.coordinatorId || null;
  const prevCoordId = event.coordinatorId;

  const before = {
    title: event.title, coordinatorId: event.coordinatorId, isVip: event.isVip, status: event.status,
  };

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: {
      title: d.title,
      eventDate: new Date(d.eventDate),
      confirmationReceived: parseDate(d.confirmationReceived),
      coordinatorId: coordId,
      salespersonName: d.salespersonName || null,
      maximizerNumber: d.maximizerNumber || null,
      isVip: d.isVip === "true" || d.isVip === "on",
      estimatedGuests: d.estimatedGuests ? parseInt(d.estimatedGuests) : null,
      clientName: d.clientName || null,
      clientContact: d.clientContact || null,
      setupStart: new Date(d.setupStart),
      setupEnd: new Date(d.setupEnd),
      liveStart: new Date(d.liveStart),
      liveEnd: new Date(d.liveEnd),
      breakdownStart: new Date(d.breakdownStart),
      breakdownEnd: new Date(d.breakdownEnd),
      ...(event.functionSheetSentAt ? { lastEditedAfterSendAt: new Date() } : {}),
    },
  });

  const diff = buildDiff(before as Record<string, unknown>, {
    title: updated.title, coordinatorId: updated.coordinatorId, isVip: updated.isVip, status: updated.status,
  });
  await logAudit({ actorId: actor.id, action: "UPDATE", entityType: "Event", entityId: eventId, eventId, diff });

  // Notify coordinator change
  if (coordId && coordId !== prevCoordId) {
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    await notify({
      userIds: [coordId],
      type: "EVENT_ASSIGNED",
      title: `You've been assigned as coordinator for: ${updated.title}`,
      body: `Event date: ${updated.eventDate.toLocaleDateString()}`,
      eventId,
      url: `${appUrl}/events/${eventId}`,
      sendEmail: true,
      emailSubject: `[BIC] You're the coordinator for: ${updated.title}`,
      emailText: `You've been assigned as event coordinator for "${updated.title}".\n\nView it: ${appUrl}/events/${eventId}`,
      emailHtml: `<p>You've been assigned as coordinator for <strong>${updated.title}</strong>.</p><p><a href="${appUrl}/events/${eventId}">View the event</a></p>`,
    });
  }

  // Notify edit-after-send
  if (event.functionSheetSentAt) {
    await notifyFunctionSheetUpdated(eventId, `Event header updated by ${actor.displayName}`, actor.id);
  }

  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

export async function updateEventStatusAction(
  eventId: string,
  status: string,
): Promise<ActionResult> {
  const actor = await requireSession();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return { ok: false, error: "Not found." };
  if (!canEditEvent(actor, event)) return { ok: false, error: "Not allowed." };

  const validStatuses = ["DRAFT","CONFIRMED","FUNCTION_SHEET_SENT","IN_SETUP","LIVE","CLOSED","ARCHIVED"] as const;
  if (!validStatuses.includes(status as (typeof validStatuses)[number])) return { ok: false, error: "Invalid status." };

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: {
      status: status as typeof validStatuses[number],
      ...(status === "FUNCTION_SHEET_SENT" && !event.functionSheetSentAt ? { functionSheetSentAt: new Date() } : {}),
    },
  });

  await logAudit({ actorId: actor.id, action: "STATUS_CHANGE", entityType: "Event", entityId: eventId, eventId, diff: { status: { before: event.status, after: status } } });

  if (status === "FUNCTION_SHEET_SENT") {
    await sendFunctionSheetNotifications(eventId, actor.id);
  }

  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

export async function sendFunctionSheetAction(eventId: string): Promise<ActionResult> {
  return updateEventStatusAction(eventId, "FUNCTION_SHEET_SENT");
}

async function sendFunctionSheetNotifications(eventId: string, actorId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      departments: {
        include: { department: { include: { members: { where: { isManager: true } } } } },
      },
    },
  });
  if (!event) return;

  const managerIds = [
    ...new Set(
      event.departments.flatMap((ed) => ed.department.members.map((m) => m.userId)),
    ),
  ];

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const url = `${appUrl}/events/${eventId}`;

  await notify({
    userIds: managerIds,
    type: "FUNCTION_SHEET_SENT",
    title: `Function sheet sent: ${event.title}`,
    body: `Event date: ${event.eventDate.toLocaleDateString()}`,
    eventId,
    url,
    sendEmail: true,
    emailSubject: `[BIC] Function sheet: ${event.title}`,
    emailText: `The function sheet for "${event.title}" (${event.eventDate.toLocaleDateString()}) has been sent to your department.\n\nView it: ${url}`,
    emailHtml: `<p>The function sheet for <strong>${event.title}</strong> (${event.eventDate.toLocaleDateString()}) has been sent to your department.</p><p><a href="${url}">View the function sheet</a></p>`,
  });

  await logAudit({ actorId, action: "SEND_FUNCTION_SHEET", entityType: "Event", entityId: eventId, eventId });
}

export async function notifyFunctionSheetUpdated(eventId: string, changeDesc: string, actorId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      departments: {
        include: { department: { include: { members: { where: { isManager: true } } } } },
      },
    },
  });
  if (!event) return;

  const managerIds = [
    ...new Set(event.departments.flatMap((ed) => ed.department.members.map((m) => m.userId))),
  ];

  // Write FUNCTION_SHEET_UPDATED rows (not immediate email — digest cron handles those)
  await prisma.notification.createMany({
    data: managerIds.map((userId) => ({
      userId,
      type: "FUNCTION_SHEET_UPDATED" as const,
      title: changeDesc,
      body: `${event.title} was updated. View the latest version.`,
      eventId,
      url: `${process.env.APP_URL ?? "http://localhost:3000"}/events/${eventId}`,
      emailedAt: null,
    })),
  });
}
