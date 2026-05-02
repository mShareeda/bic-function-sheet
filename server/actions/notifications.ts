"use server";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/authz";

export async function markAllReadAction(ids: string[]) {
  await prisma.notification.updateMany({
    where: { id: { in: ids } },
    data: { readAt: new Date() },
  });
}

export async function markOneReadAction(id: string) {
  const actor = await requireSession();
  await prisma.notification.updateMany({
    where: { id, userId: actor.id, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markAllReadForUserAction() {
  const actor = await requireSession();
  await prisma.notification.updateMany({
    where: { userId: actor.id, readAt: null },
    data: { readAt: new Date() },
  });
}
