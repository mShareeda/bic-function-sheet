"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession, canEditEvent, canEditDeptRequirements } from "@/lib/authz";
import { getStorage } from "@/lib/storage";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function deleteAttachmentAction(attachmentId: string): Promise<ActionResult> {
  const actor = await requireSession();

  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: {
      event: { select: { id: true, coordinatorId: true } },
      requirement: {
        select: {
          eventId: true,
          departmentId: true,
          event: { select: { id: true, coordinatorId: true } },
        },
      },
    },
  });

  if (!attachment) return { ok: false, error: "Attachment not found." };

  let allowed = false;

  if (attachment.event) {
    allowed = canEditEvent(actor, attachment.event);
  } else if (attachment.requirement) {
    const memberOf = await prisma.departmentMember.findMany({
      where: { userId: actor.id, isManager: true },
      select: { departmentId: true },
    });
    const managedDeptIds = memberOf.map((m) => m.departmentId);
    allowed = canEditDeptRequirements(
      actor,
      attachment.requirement.event,
      managedDeptIds,
      attachment.requirement.departmentId,
    );
  }

  if (!allowed) return { ok: false, error: "Not allowed." };

  await getStorage().delete(attachment.storageKey);
  await prisma.attachment.delete({ where: { id: attachmentId } });

  if (attachment.eventId) revalidatePath(`/events/${attachment.eventId}`);
  if (attachment.requirement) {
    revalidatePath(
      `/events/${attachment.requirement.eventId}/requirements/${attachment.requirement.departmentId}`,
    );
  }

  return { ok: true };
}
