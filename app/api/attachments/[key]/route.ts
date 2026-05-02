import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStorage, LocalDiskStorage } from "@/lib/storage";
import { canViewFullFunctionSheet } from "@/lib/authz";
import type { SessionUser } from "@/lib/authz";

export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const { key } = await params;
  const storageKey = decodeURIComponent(key);

  const attachment = await prisma.attachment.findFirst({ where: { storageKey } });
  if (!attachment) return new NextResponse("Not found", { status: 404 });

  const user = session.user as SessionUser;

  // ── Event-level attachment ──────────────────────────────────────────────
  if (attachment.eventId) {
    const event = await prisma.event.findUnique({
      where: { id: attachment.eventId },
      include: { departments: { select: { departmentId: true } } },
    });
    if (!event) return new NextResponse("Not found", { status: 404 });

    const managedDeptIds = await getManagedDeptIds(user.id);
    const eventDeptIds = event.departments.map((d) => d.departmentId);

    if (!canViewFullFunctionSheet(user, event, managedDeptIds, eventDeptIds)) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }
  // ── Requirement-level attachment ────────────────────────────────────────
  else if (attachment.requirementId) {
    const requirement = await prisma.departmentRequirement.findUnique({
      where: { id: attachment.requirementId },
      include: {
        event: { include: { departments: { select: { departmentId: true } } } },
        assignments: { select: { userId: true } },
      },
    });
    if (!requirement) return new NextResponse("Not found", { status: 404 });

    const managedDeptIds = await getManagedDeptIds(user.id);
    const eventDeptIds = requirement.event.departments.map((d) => d.departmentId);

    const canView = canViewFullFunctionSheet(user, requirement.event, managedDeptIds, eventDeptIds);
    const isAssigned = requirement.assignments.some((a) => a.userId === user.id);

    if (!canView && !isAssigned) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  } else {
    // Orphaned attachment with no owner — deny
    return new NextResponse("Forbidden", { status: 403 });
  }

  const storage = getStorage();

  if (storage instanceof LocalDiskStorage) {
    const data = await (storage as LocalDiskStorage).readFile(storageKey);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": attachment.contentType,
        "Content-Disposition": `attachment; filename="${attachment.fileName}"`,
      },
    });
  }

  // Azure: redirect to signed URL
  const url = await storage.getDownloadUrl(storageKey);
  return NextResponse.redirect(url);
}

async function getManagedDeptIds(userId: string): Promise<string[]> {
  const memberships = await prisma.departmentMember.findMany({
    where: { userId, isManager: true },
    select: { departmentId: true },
  });
  return memberships.map((m) => m.departmentId);
}
