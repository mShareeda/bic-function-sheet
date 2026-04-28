import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

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
      <h1 className="text-2xl font-bold">My tasks</h1>
      {byEvent.size === 0 && <p className="text-muted-foreground">No tasks assigned to you yet.</p>}
      {[...byEvent.entries()].map(([, items]) => {
        const event = items[0].requirement.event;
        return (
          <Card key={event.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{event.title}</CardTitle>
                <span className="text-xs text-muted-foreground">
                  {format(event.eventDate, "EEE d MMM yyyy")}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((a) => (
                <div key={a.requirementId} className="border rounded-md p-3">
                  <p className="text-sm whitespace-pre-wrap">{a.requirement.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">{a.requirement.department.name}</Badge>
                    {a.requirement.priority && (
                      <Badge variant="secondary" className="text-xs">{a.requirement.priority}</Badge>
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
