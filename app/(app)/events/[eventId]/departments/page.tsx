import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditEvent } from "@/lib/authz";
import type { SessionUser } from "@/lib/authz";
import { DepartmentPicker } from "@/components/events/department-picker";

export default async function EventDepartmentsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const session = await auth();
  const u = session!.user as SessionUser;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { departments: { include: { department: true } } },
  });
  if (!event) notFound();
  if (!canEditEvent(u, event)) redirect(`/events/${eventId}`);

  const allDepts = await prisma.department.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Departments</h1>
        <p className="text-sm text-muted-foreground">{event.title}</p>
      </div>
      <DepartmentPicker
        eventId={eventId}
        allDepts={allDepts}
        activeDeptIds={event.departments.map((d) => d.departmentId)}
      />
    </div>
  );
}
