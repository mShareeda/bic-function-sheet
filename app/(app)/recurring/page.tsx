import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canCreateEvent } from "@/lib/authz";
import type { SessionUser } from "@/lib/authz";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Plus, Building2, ListChecks, CalendarClock, Repeat2 } from "lucide-react";

export default async function RecurringPage() {
  const session = await auth();
  const u = session!.user as SessionUser;
  if (!canCreateEvent(u)) redirect("/dashboard");

  const templates = await prisma.eventTemplate.findMany({
    orderBy: { updatedAt: "desc" },
    include: { createdBy: { select: { displayName: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Recurring events
          </p>
          <h1 className="mt-1 text-display">Templates</h1>
          <p className="text-sm text-muted-foreground">
            Reusable scaffolds — departments, requirements and agenda items
            pre-filled for similar events.
          </p>
        </div>
        <Button asChild>
          <Link href="/recurring/new">
            <Plus className="h-4 w-4" />
            New template
          </Link>
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="glass rounded-xl flex flex-col items-center justify-center gap-4 py-20 text-center">
          <Repeat2 className="h-10 w-10 text-muted-foreground/40" />
          <div>
            <p className="font-medium">No templates yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create a template to pre-fill departments, requirements, and agenda
              items for recurring events.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/recurring/new">
              <Plus className="h-4 w-4" />
              Create first template
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((tmpl) => {
            const depts = Array.isArray(tmpl.departments) ? tmpl.departments : [];
            const agenda = Array.isArray(tmpl.agendaItems) ? tmpl.agendaItems : [];

            return (
              <Link
                key={tmpl.id}
                href={`/recurring/${tmpl.id}`}
                className="block group"
              >
                <Card className="h-full glass transition-all duration-200 group-hover:shadow-glass-lg group-hover:-translate-y-0.5">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-snug">
                        {tmpl.title}
                      </CardTitle>
                      {tmpl.isVip && (
                        <span className="flex-shrink-0 text-xs font-semibold text-vip bg-vip/10 ring-1 ring-vip/20 rounded-full px-2 py-0.5">
                          ★ VIP
                        </span>
                      )}
                    </div>
                    {tmpl.eventType && (
                      <p className="text-xs text-muted-foreground capitalize">
                        {tmpl.eventType.replace(/_/g, " ")}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {tmpl.description && (
                      <p className="text-muted-foreground text-xs line-clamp-2">
                        {tmpl.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {depts.length} dept{depts.length !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <ListChecks className="h-3.5 w-3.5" />
                        {agenda.length} agenda item{agenda.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    <div className="border-t border-border/40 pt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" />
                        {format(tmpl.updatedAt, "d MMM yyyy")}
                      </span>
                      <span>{tmpl.createdBy.displayName}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
