import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canCreateEvent, isAdmin } from "@/lib/authz";
import type { SessionUser } from "@/lib/authz";
import { redirect } from "next/navigation";
import { RecurringShell } from "@/components/events/recurring-shell";
import type { TemplateDept, TemplateAgendaItem } from "@/server/actions/templates";

export default async function RecurringPage() {
  const session = await auth();
  const u = session!.user as SessionUser;
  if (!canCreateEvent(u)) redirect("/dashboard");

  const [templateRows, coordinators] = await Promise.all([
    prisma.eventTemplate.findMany({
      orderBy: { updatedAt: "desc" },
      include: { createdBy: { select: { displayName: true } } },
    }),
    prisma.user.findMany({
      where: { isActive: true, roles: { some: { role: "COORDINATOR" } } },
      select: { id: true, displayName: true },
      orderBy: { displayName: "asc" },
    }),
  ]);

  const templates = templateRows.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    eventType: t.eventType,
    isVip: t.isVip,
    estimatedGuests: t.estimatedGuests,
    salespersonName: t.salespersonName,
    departments: (Array.isArray(t.departments) ? t.departments : []) as TemplateDept[],
    agendaItems: (Array.isArray(t.agendaItems) ? t.agendaItems : []) as TemplateAgendaItem[],
    createdById: t.createdById,
    createdByName: t.createdBy.displayName,
    updatedAt: t.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Recurring events
        </p>
        <h1 className="mt-1 text-display">Templates</h1>
        <p className="text-sm text-muted-foreground">
          Select a template to create a new event — departments and requirements
          are pre-filled and update automatically as you use them.
        </p>
      </div>

      <RecurringShell
        templates={templates}
        coordinators={coordinators}
        currentUserId={u.id}
        isAdmin={isAdmin(u)}
      />
    </div>
  );
}
