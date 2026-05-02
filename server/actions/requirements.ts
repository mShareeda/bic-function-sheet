"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession, canEditEvent, canEditDeptRequirements, canAuthorManagerNote } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { notifyFunctionSheetUpdated } from "./events";

export type ActionResult = { ok: true } | { ok: false; error: string };

// Add a department to an event
export async function addEventDepartmentAction(eventId: string, departmentId: string): Promise<ActionResult> {
  const actor = await requireSession();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return { ok: false, error: "Event not found." };
  if (!canEditEvent(actor, event)) return { ok: false, error: "Not allowed." };

  await prisma.eventDepartment.upsert({
    where: { eventId_departmentId: { eventId, departmentId } },
    create: { eventId, departmentId },
    update: {},
  });

  await logAudit({ actorId: actor.id, action: "CREATE", entityType: "EventDepartment", entityId: `${eventId}:${departmentId}`, eventId });

  // Notify managers of this dept only if function sheet already sent
  if (event.functionSheetSentAt) {
    const dept = await prisma.department.findUnique({
      where: { id: departmentId },
      include: { members: { where: { isManager: true } } },
    });
    const managerIds = (dept?.members ?? []).map((m) => m.userId);
    if (managerIds.length) {
      const appUrl = process.env.APP_URL ?? "http://localhost:3000";
      await notify({
        userIds: managerIds,
        type: "FUNCTION_SHEET_UPDATED",
        title: `Your department was added to an event: ${event.title}`,
        body: `Event date: ${event.eventDate.toLocaleDateString()}`,
        eventId,
        url: `${appUrl}/events/${eventId}`,
        sendEmail: false, // digest will handle
      });
    }
  }

  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

export async function removeEventDepartmentAction(eventId: string, departmentId: string): Promise<ActionResult> {
  const actor = await requireSession();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return { ok: false, error: "Not found." };
  if (!canEditEvent(actor, event)) return { ok: false, error: "Not allowed." };

  await prisma.eventDepartment.deleteMany({ where: { eventId, departmentId } });
  await logAudit({ actorId: actor.id, action: "DELETE", entityType: "EventDepartment", entityId: `${eventId}:${departmentId}`, eventId });
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

export async function addEventVenueAction(eventId: string, venueId: string): Promise<ActionResult> {
  const actor = await requireSession();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return { ok: false, error: "Event not found." };
  if (!canEditEvent(actor, event)) return { ok: false, error: "Not allowed." };

  await prisma.eventVenue.upsert({
    where: { eventId_venueId: { eventId, venueId } },
    create: { eventId, venueId },
    update: {},
  });

  await logAudit({ actorId: actor.id, action: "CREATE", entityType: "EventVenue", entityId: `${eventId}:${venueId}`, eventId });
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

export async function removeEventVenueAction(eventId: string, venueId: string): Promise<ActionResult> {
  const actor = await requireSession();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return { ok: false, error: "Event not found." };
  if (!canEditEvent(actor, event)) return { ok: false, error: "Not allowed." };

  await prisma.eventVenue.deleteMany({ where: { eventId, venueId } });
  await logAudit({ actorId: actor.id, action: "DELETE", entityType: "EventVenue", entityId: `${eventId}:${venueId}`, eventId });
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

const requirementSchema = z.object({
  description: z.string().min(1),
  priority: z.string().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export async function upsertRequirementAction(
  eventId: string,
  departmentId: string,
  requirementId: string | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireSession();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return { ok: false, error: "Event not found." };

  const memberOf = await prisma.departmentMember.findMany({
    where: { userId: actor.id, isManager: true },
    select: { departmentId: true },
  });
  const managedDeptIds = memberOf.map((m) => m.departmentId);

  if (!canEditDeptRequirements(actor, event, managedDeptIds, departmentId)) {
    return { ok: false, error: "Not allowed." };
  }

  const parsed = requirementSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const ed = await prisma.eventDepartment.findUnique({
    where: { eventId_departmentId: { eventId, departmentId } },
  });
  if (!ed) return { ok: false, error: "Department not on this event." };

  if (requirementId) {
    await prisma.departmentRequirement.update({
      where: { id: requirementId },
      data: { ...parsed.data, updatedById: actor.id },
    });
    await logAudit({ actorId: actor.id, action: "UPDATE", entityType: "DepartmentRequirement", entityId: requirementId, eventId });
  } else {
    const req = await prisma.departmentRequirement.create({
      data: {
        eventId,
        departmentId,
        eventDepartmentId: ed.id,
        description: parsed.data.description,
        priority: parsed.data.priority || null,
        sortOrder: parsed.data.sortOrder ?? 0,
        updatedById: actor.id,
      },
    });
    await logAudit({ actorId: actor.id, action: "CREATE", entityType: "DepartmentRequirement", entityId: req.id, eventId });
  }

  if (event.functionSheetSentAt) {
    await notifyFunctionSheetUpdated(eventId, `Requirements updated for a department by ${actor.displayName}`, actor.id);
  }

  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

export async function deleteRequirementAction(requirementId: string, eventId: string): Promise<ActionResult> {
  const actor = await requireSession();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  const req = await prisma.departmentRequirement.findUnique({ where: { id: requirementId } });
  if (!event || !req) return { ok: false, error: "Not found." };

  const memberOf = await prisma.departmentMember.findMany({ where: { userId: actor.id, isManager: true }, select: { departmentId: true } });
  const managedDeptIds = memberOf.map((m) => m.departmentId);

  if (!canEditDeptRequirements(actor, event, managedDeptIds, req.departmentId)) {
    return { ok: false, error: "Not allowed." };
  }

  await prisma.departmentRequirement.delete({ where: { id: requirementId } });
  await logAudit({ actorId: actor.id, action: "DELETE", entityType: "DepartmentRequirement", entityId: requirementId, eventId });

  if (event.functionSheetSentAt) {
    await notifyFunctionSheetUpdated(eventId, `A requirement was removed by ${actor.displayName}`, actor.id);
  }

  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

export async function assignTeamMemberAction(requirementId: string, userId: string, eventId: string): Promise<ActionResult> {
  const actor = await requireSession();
  const req = await prisma.departmentRequirement.findUnique({ where: { id: requirementId } });
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!req || !event) return { ok: false, error: "Not found." };

  const memberOf = await prisma.departmentMember.findMany({ where: { userId: actor.id, isManager: true }, select: { departmentId: true } });
  const managedDeptIds = memberOf.map((m) => m.departmentId);
  if (!canEditDeptRequirements(actor, event, managedDeptIds, req.departmentId)) return { ok: false, error: "Not allowed." };

  // Verify the user is a member of this dept
  const membership = await prisma.departmentMember.findUnique({
    where: { userId_departmentId: { userId, departmentId: req.departmentId } },
  });
  if (!membership) return { ok: false, error: "User is not a member of this department." };

  await prisma.requirementAssignment.upsert({
    where: { requirementId_userId: { requirementId, userId } },
    create: { requirementId, userId, assignedById: actor.id },
    update: {},
  });

  await logAudit({ actorId: actor.id, action: "ASSIGN", entityType: "RequirementAssignment", entityId: requirementId, eventId });

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  await notify({
    userIds: [userId],
    type: "REQUIREMENT_ASSIGNED",
    title: `You've been assigned a task for: ${event.title}`,
    body: req.description.slice(0, 200),
    eventId,
    requirementId,
    url: `${appUrl}/my-tasks`,
    sendEmail: true,
    emailSubject: `[BIC] Task assignment: ${event.title}`,
    emailText: `You've been assigned a task for "${event.title}".\n\nTask: ${req.description}\n\nView your tasks: ${appUrl}/my-tasks`,
    emailHtml: `<p>You've been assigned a task for <strong>${event.title}</strong>.</p><p><strong>Task:</strong> ${req.description}</p><p><a href="${appUrl}/my-tasks">View your tasks</a></p>`,
  });

  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

export async function unassignTeamMemberAction(requirementId: string, userId: string, eventId: string): Promise<ActionResult> {
  const actor = await requireSession();
  const req = await prisma.departmentRequirement.findUnique({ where: { id: requirementId } });
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!req || !event) return { ok: false, error: "Not found." };

  const memberOf = await prisma.departmentMember.findMany({ where: { userId: actor.id, isManager: true }, select: { departmentId: true } });
  const managedDeptIds = memberOf.map((m) => m.departmentId);
  if (!canEditDeptRequirements(actor, event, managedDeptIds, req.departmentId)) return { ok: false, error: "Not allowed." };

  await prisma.requirementAssignment.deleteMany({ where: { requirementId, userId } });
  await logAudit({ actorId: actor.id, action: "UNASSIGN", entityType: "RequirementAssignment", entityId: requirementId, eventId });

  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

export async function addManagerNoteAction(requirementId: string, eventId: string, body: string): Promise<ActionResult> {
  const actor = await requireSession();
  const req = await prisma.departmentRequirement.findUnique({ where: { id: requirementId } });
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!req || !event) return { ok: false, error: "Not found." };

  const memberOf = await prisma.departmentMember.findMany({ where: { userId: actor.id, isManager: true }, select: { departmentId: true } });
  const managedDeptIds = memberOf.map((m) => m.departmentId);
  if (!canAuthorManagerNote(actor, managedDeptIds, req.departmentId)) return { ok: false, error: "Not allowed." };

  const note = await prisma.requirementNote.create({
    data: { requirementId, authorId: actor.id, body },
  });

  await logAudit({ actorId: actor.id, action: "CREATE", entityType: "RequirementNote", entityId: note.id, eventId });

  // Notify coordinator
  if (event.coordinatorId) {
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    await notify({
      userIds: [event.coordinatorId],
      type: "MANAGER_NOTE_ADDED",
      title: `New note on a requirement for: ${event.title}`,
      body: body.slice(0, 200),
      eventId,
      requirementId,
      url: `${appUrl}/events/${eventId}/requirements/${req.departmentId}`,
      sendEmail: true,
      emailSubject: `[BIC] Manager note: ${event.title}`,
      emailText: `A department manager left a note on a requirement for "${event.title}".\n\nNote: ${body}\n\nView: ${appUrl}/events/${eventId}/requirements/${req.departmentId}`,
      emailHtml: `<p>A department manager left a note on a requirement for <strong>${event.title}</strong>.</p><p><strong>Note:</strong> ${body}</p><p><a href="${appUrl}/events/${eventId}/requirements/${req.departmentId}">View it</a></p>`,
    });
  }

  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

export async function reorderRequirementsAction(
  eventId: string,
  departmentId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  const actor = await requireSession();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return { ok: false, error: "Not found." };
  const memberOf = await prisma.departmentMember.findMany({ where: { userId: actor.id, isManager: true }, select: { departmentId: true } });
  const managedDeptIds = memberOf.map((m) => m.departmentId);
  if (!canEditDeptRequirements(actor, event, managedDeptIds, departmentId))
    return { ok: false, error: "Not allowed." };

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.departmentRequirement.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );

  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}
