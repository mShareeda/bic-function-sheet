import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canCreateEvent, isAdmin } from "@/lib/authz";
import type { SessionUser } from "@/lib/authz";
import { ChevronLeft } from "lucide-react";
import { TemplateForm } from "@/components/events/template-form";
import type { TemplateDept, TemplateAgendaItem } from "@/server/actions/templates";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  const session = await auth();
  const u = session!.user as SessionUser;
  if (!canCreateEvent(u)) redirect("/dashboard");

  const tmpl = await prisma.eventTemplate.findUnique({ where: { id: templateId } });
  if (!tmpl) notFound();

  // Only creator or admin can edit
  if (tmpl.createdById !== u.id && !isAdmin(u)) redirect(`/recurring/${templateId}`);

  const departments = await prisma.department.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });

  const depts = (Array.isArray(tmpl.departments) ? tmpl.departments : []) as TemplateDept[];
  const agendaItems = (Array.isArray(tmpl.agendaItems) ? tmpl.agendaItems : []) as TemplateAgendaItem[];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          href={`/recurring/${templateId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to template
        </Link>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Recurring events
        </p>
        <h1 className="mt-1 text-display">Edit template</h1>
      </div>

      <TemplateForm
        deptOptions={departments}
        templateId={templateId}
        initialTitle={tmpl.title}
        initialDescription={tmpl.description ?? ""}
        initialEventType={tmpl.eventType ?? ""}
        initialIsVip={tmpl.isVip}
        initialEstimatedGuests={tmpl.estimatedGuests}
        initialSalespersonName={tmpl.salespersonName}
        initialDepartments={depts}
        initialAgendaItems={agendaItems}
      />
    </div>
  );
}
