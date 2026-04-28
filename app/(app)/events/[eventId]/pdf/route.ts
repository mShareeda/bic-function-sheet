import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canExportPdf } from "@/lib/authz";
import type { SessionUser } from "@/lib/authz";
import { renderFunctionSheetPdf } from "@/lib/pdf";

export async function GET(_req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const u = session.user as SessionUser;
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return new NextResponse("Not found", { status: 404 });

  const memberOf = await prisma.departmentMember.findMany({
    where: { userId: u.id, isManager: true },
    select: { departmentId: true },
  });
  const managedDeptIds = memberOf.map((m) => m.departmentId);
  const eventDeptIds = await prisma.eventDepartment
    .findMany({ where: { eventId }, select: { departmentId: true } })
    .then((rows) => rows.map((r) => r.departmentId));

  if (!canExportPdf(u, event, managedDeptIds, eventDeptIds)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const pdfBuffer = await renderFunctionSheetPdf(eventId);
  const safeTitle = event.title.replace(/[^a-zA-Z0-9 _-]/g, "").trim();

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeTitle} - Function Sheet.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
