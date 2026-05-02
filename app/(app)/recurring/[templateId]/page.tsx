import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canCreateEvent, isAdmin } from "@/lib/authz";
import type { SessionUser } from "@/lib/authz";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Pencil, Building2, Clock, Star } from "lucide-react";
import { CreateFromTemplateDialog } from "@/components/events/create-from-template-dialog";
import { DeleteTemplateButton } from "@/components/events/delete-template-button";
import type {
  TemplateDept,
  TemplateAgendaItem,
} from "@/server/actions/templates";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  const session = await auth();
  const u = session!.user as SessionUser;
  if (!canCreateEvent(u)) redirect("/dashboard");

  const tmpl = await prisma.eventTemplate.findUnique({
    where: { id: templateId },
    include: { createdBy: { select: { displayName: true } } },
  });
  if (!tmpl) notFound();

  const depts = (Array.isArray(tmpl.departments) ? tmpl.departments : []) as TemplateDept[];
  const agendaItems = (Array.isArray(tmpl.agendaItems) ? tmpl.agendaItems : []) as TemplateAgendaItem[];

  const canEdit = isAdmin(u) || tmpl.createdById === u.id;

  // For "create from template" dialog
  const coordinators = await prisma.user.findMany({
    where: {
      isActive: true,
      roles: { some: { role: "COORDINATOR" } },
    },
    select: { id: true, displayName: true },
    orderBy: { displayName: "asc" },
  });

  const templateRecord = {
    ...tmpl,
    departments: depts,
    agendaItems,
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back nav */}
      <Link
        href="/recurring"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to templates
      </Link>

      {/* Header */}
      <div
        className={`glass-strong sticky top-14 z-20 -mx-4 lg:-mx-8 px-4 lg:px-8 py-4 border-b backdrop-blur-glass-strong ${
          tmpl.isVip ? "border-vip/60 ring-1 ring-vip/30" : "border-border/40"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Event template
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-h1 truncate">{tmpl.title}</h1>
              {tmpl.isVip && (
                <span className="text-xs font-semibold text-vip bg-vip/10 ring-1 ring-vip/20 rounded-full px-2 py-0.5">
                  ★ VIP
                </span>
              )}
            </div>
            {tmpl.eventType && (
              <p className="text-sm text-muted-foreground capitalize mt-1">
                {tmpl.eventType.replace(/_/g, " ")}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <CreateFromTemplateDialog
              template={templateRecord}
              coordinators={coordinators}
            />
            {canEdit && (
              <Button asChild size="sm" variant="outline">
                <Link href={`/recurring/${templateId}/edit`}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit template
                </Link>
              </Button>
            )}
            {canEdit && (
              <DeleteTemplateButton templateId={templateId} />
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {tmpl.description && (
        <p className="text-sm text-muted-foreground">{tmpl.description}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        {/* Departments */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Departments ({depts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {depts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No departments configured.
                </p>
              ) : (
                depts.map((d) => (
                  <div
                    key={d.departmentId}
                    className="glass-subtle rounded-md p-3 space-y-1.5"
                  >
                    <p className="text-sm font-semibold">{d.departmentName}</p>
                    {d.requirements ? (
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {d.requirements}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        No requirements defined.
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Agenda */}
          {agendaItems.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Agenda ({agendaItems.length} items)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/40 text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="py-3 px-4 text-left font-medium">#</th>
                        <th className="py-3 px-4 text-left font-medium">Time</th>
                        <th className="py-3 px-4 text-left font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agendaItems.map((item) => (
                        <tr
                          key={item.sequence}
                          className="border-b border-border/30 last:border-0 hover:bg-surface/40 transition-colors"
                        >
                          <td className="py-2.5 px-4 tabular-nums text-muted-foreground">
                            {item.sequence}
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap tabular-nums font-mono text-xs">
                            {item.startTime} – {item.endTime}
                          </td>
                          <td className="py-2.5 px-4">{item.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick facts sidebar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quick facts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              ["Event type", tmpl.eventType?.replace(/_/g, " ")],
              ["Estimated guests", tmpl.estimatedGuests?.toString()],
              ["Salesperson", tmpl.salespersonName],
              ["VIP template", tmpl.isVip ? "Yes" : null],
              ["Created by", tmpl.createdBy.displayName],
            ]
              .filter(([, v]) => v)
              .map(([label, value]) => (
                <div key={label as string}>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {label}
                  </p>
                  <p className="font-medium capitalize">{value}</p>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
