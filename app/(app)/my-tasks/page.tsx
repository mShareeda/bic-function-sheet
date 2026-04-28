import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { format } from "date-fns";
import { CheckSquare } from "lucide-react";

export default async function MyTasksPage() {
  const session = await auth();
  const userId = session!.user.id;

  const assignments = await prisma.requirementAssignment.findMany({
    where: { userId },
    include: {
      requirement: {
        include: {
          department: { select: { name: true } },
          event: { select: { id: true, title: true, eventDate: true, status: true } },
        },
      },
    },
    orderBy: { requirement: { event: { eventDate: "asc" } } },
  });

  // Group by event
  const byEvent = new Map<string, typeof assignments>();
  for (const a of assignments) {
    const key = a.requirement.event.id;
    if (!byEvent.has(key)) byEvent.set(key, []);
    byEvent.get(key)!.push(a);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Workspace
        </p>
        <h1 className="mt-1 text-display">My tasks</h1>
        <p className="text-sm text-muted-foreground">
          {assignments.length} requirement{assignments.length === 1 ? "" : "s"}{" "}
          across {byEvent.size} event{byEvent.size === 1 ? "" : "s"}
        </p>
      </div>
      {byEvent.size === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-muted/50 text-muted-foreground">
              <CheckSquare className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium">Nothing on your plate</p>
            <p className="text-xs text-muted-foreground">
              Tasks assigned to you will appear here.
            </p>
          </CardContent>
        </Card>
      )}
      {[...byEvent.entries()].map(([, items]) => {
        const event = items[0].requirement.event;
        return (
          <Card key={event.id}>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">
                  <Link
                    href={`/events/${event.id}`}
                    className="hover:text-primary transition-colors"
                  >
                    {event.title}
                  </Link>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <StatusBadge status={event.status} />
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {format(event.eventDate, "EEE d MMM yyyy")}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {items.map((a) => (
                <div key={a.requirementId} className="glass-subtle rounded-md p-3">
                  <p className="text-sm whitespace-pre-wrap">
                    {a.requirement.description}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {a.requirement.department.name}
                    </Badge>
                    {a.requirement.priority && (
                      <Badge variant="secondary" className="text-xs">
                        {a.requirement.priority}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
