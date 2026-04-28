"use server";

import { prisma } from "@/lib/db";

export async function markAllReadAction(ids: string[]) {
  await prisma.notification.updateMany({
    where: { id: { in: ids } },
    data: { readAt: new Date() },
  });
}
