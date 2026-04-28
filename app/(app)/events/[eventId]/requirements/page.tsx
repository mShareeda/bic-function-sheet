import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditEvent } from "@/lib/authz";
import type { SessionUser } from "@/lib/authz";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function RequirementsOverviewPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const session = await auth();
  const u = session!.user as SessionUser;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      departments: {
        include: {
          department: true,
          requirements: { include: { assignments: true } },
        },
        orderBy: { department: { sortOrder: "asc" } },
      },
    },
  });
  if (!event) notFound();
  if (!canEditEvent(u, event)) redirect(`/events/${eventId}`);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Requirements</h1>
          <p className="text-sm text-muted-foreground">{event.title}</p>
        </div>
      </div>

      {event.departments.length === 0 && (
        <p className="text-muted-foreground">No departments added yet. <Link href={`/events/${eventId}/departments`} className="underline text-primary">Add departments</Link></p>
      )}

      <div className="grid gap-4">
        {event.departments.map((ed) => (
          <Card key={ed.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{ed.department.name}</CardTitle>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/events/${eventId}/requirements/${ed.departmentId}`}>
                    {ed.requirements.length === 0 ? "Add requirements" : "Edit"}
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {ed.requirements.length === 0 ? (
                <p className="text-sm text-muted-foreground">No requirements yet.</p>
              ) : (
                <ul className="space-y-2">
                  {ed.requirements.map((r) => (
                    <li key={r.id} className="text-sm flex items-start gap-2">
                      <span className="flex-1">{r.description.slice(0, 120)}{r.description.length > 120 ? "…" : ""}</span>
                      {r.assignments.length > 0 && (
                        <Badge variant="secondary">{r.assignments.length} assigned</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
