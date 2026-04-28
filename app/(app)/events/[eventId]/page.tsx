import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditEvent, canViewFullFunctionSheet, isAdmin, hasRole } from "@/lib/authz";
import type { SessionUser } from "@/lib/authz";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { StatusChanger } from "@/components/events/status-changer";
import { AttachmentPanel } from "@/components/events/attachment-panel";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft", CONFIRMED: "Confirmed", FUNCTION_SHEET_SENT: "Sheet Sent",
  IN_SETUP: "In Setup", LIVE: "Live", CLOSED: "Closed", ARCHIVED: "Archived",
};

export default async function EventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const session = await auth();
  const u = session!.user as SessionUser;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      coordinator: { select: { displayName: true } },
      attachments: {
        include: { uploadedBy: { select: { displayName: true } } },
        orderBy: { createdAt: "asc" },
      },
      agendaItems: { include: { venue: true }, orderBy: { sequence: "asc" } },
      departments: {
        include: {
          department: true,
          requirements: {
            include: {
              assignments: { include: { user: { select: { id: true, displayName: true } } } },
              managerNotes: { include: { author: { select: { id: true, displayName: true } } } },
            },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { department: { sortOrder: "asc" } },
      },
    },
  });
  if (!event) notFound();

  const memberOf = await prisma.departmentMember.findMany({
    where: { userId: u.id, isManager: true },
    select: { departmentId: true },
  });
  const managedDeptIds = memberOf.map((m) => m.departmentId);
  const eventDeptIds = event.departments.map((d) => d.departmentId);

  const canEdit = canEditEvent(u, event);
  const canFullView = canViewFullFunctionSheet(u, event, managedDeptIds, eventDeptIds);

  // Team member: only show their assigned requirements
  const assignedReqIds = new Set<string>();
  if (!canFullView && hasRole(u, "DEPT_TEAM_MEMBER")) {
    const assignments = await prisma.requirementAssignment.findMany({
      where: { userId: u.id, requirement: { eventId } },
      select: { requirementId: true },
    });
    assignments.forEach((a) => assignedReqIds.add(a.requirementId));
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{event.title}</h1>
            {event.isVip && <Badge>VIP</Badge>}
            <span className="text-sm px-2 py-1 rounded-full bg-muted font-medium">
              {STATUS_LABEL[event.status] ?? event.status}
            </span>
          </div>
          <p className="text-muted-foreground">{format(event.eventDate, "EEEE, d MMMM yyyy")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <>
              <Button asChild size="sm" variant="outline"><Link href={`/events/${eventId}/edit`}>Edit</Link></Button>
              <Button asChild size="sm" variant="outline"><Link href={`/events/${eventId}/agenda`}>Agenda</Link></Button>
              <Button asChild size="sm" variant="outline"><Link href={`/events/${eventId}/departments`}>Departments</Link></Button>
              <Button asChild size="sm" variant="outline"><Link href={`/events/${eventId}/requirements`}>Requirements</Link></Button>
            </>
          )}
          {canFullView && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/events/${eventId}/pdf`} target="_blank">Export PDF</Link>
            </Button>
          )}
          {canEdit && <StatusChanger eventId={eventId} currentStatus={event.status} />}
          {canEdit && <Button asChild size="sm" variant="ghost"><Link href={`/events/${eventId}/audit`}>Audit</Link></Button>}
        </div>
      </div>

      {/* Details */}
      <div className="grid gap-4 sm:grid-cols-2 text-sm">
        {[
          ["Client", event.clientName],
          ["Client contact", event.clientContact],
          ["Coordinator", event.coordinator?.displayName],
          ["Salesperson", event.salespersonName],
          ["Maximizer #", event.maximizerNumber],
          ["Estimated guests", event.estimatedGuests?.toString()],
          ["Confirmation received", event.confirmationReceived ? format(event.confirmationReceived, "d MMM yyyy") : null],
        ]
          .filter(([, v]) => v)
          .map(([label, value]) => (
            <div key={label as string}>
              <span className="text-muted-foreground">{label}: </span>
              <span className="font-medium">{value}</span>
            </div>
          ))}
      </div>

      {/* Time windows */}
      <Card>
        <CardHeader><CardTitle className="text-base">Schedule</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-3">
          {(
            [
              ["Setup", event.setupStart, event.setupEnd],
              ["Live event", event.liveStart, event.liveEnd],
              ["Breakdown", event.breakdownStart, event.breakdownEnd],
            ] as [string, Date, Date][]
          ).map(([label, start, end]) => (
            <div key={label}>
              <p className="text-muted-foreground text-xs">{label}</p>
              <p>{format(start, "HH:mm")} – {format(end, "HH:mm")}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Attachments */}
      {(canEdit || event.attachments.length > 0) && (
        <Card>
          <CardHeader><CardTitle className="text-base">Attachments</CardTitle></CardHeader>
          <CardContent>
            <AttachmentPanel
              attachments={event.attachments.map((a) => ({
                id: a.id,
                fileName: a.fileName,
                byteSize: a.byteSize,
                storageKey: a.storageKey,
                createdAt: a.createdAt.toISOString(),
                uploadedBy: a.uploadedBy,
              }))}
              scope={{ eventId }}
              canUpload={canEdit}
              canDelete={canEdit}
            />
          </CardContent>
        </Card>
      )}

      {/* Agenda */}
      {event.agendaItems.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Agenda</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-xs border-b">
                  <th className="text-left py-1 pr-4">#</th>
                  <th className="text-left py-1 pr-4">Time</th>
                  <th className="text-left py-1 pr-4">Description</th>
                  <th className="text-left py-1 pr-4">Venue</th>
                  <th className="text-left py-1">Pax</th>
                </tr>
              </thead>
              <tbody>
                {event.agendaItems.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{item.sequence}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {format(item.startTime, "HH:mm")} – {format(item.endTime, "HH:mm")}
                    </td>
                    <td className="py-2 pr-4">{item.description}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{item.venue?.name ?? item.venueText ?? "—"}</td>
                    <td className="py-2">{item.participants ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Department requirements */}
      {(canFullView || assignedReqIds.size > 0) && event.departments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Department requirements</h2>
          {event.departments.map((ed) => {
            const reqs = canFullView
              ? ed.requirements
              : ed.requirements.filter((r) => assignedReqIds.has(r.id));
            if (!canFullView && reqs.length === 0) return null;

            return (
              <Card key={ed.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{ed.department.name}</CardTitle>
                    {canEdit || managedDeptIds.includes(ed.departmentId) ? (
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/events/${eventId}/requirements/${ed.departmentId}`}>Edit</Link>
                      </Button>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {reqs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No requirements yet.</p>
                  ) : (
                    reqs.map((req) => {
                      const visibleNotes = req.managerNotes.filter(
                        (n) => isAdmin(u) || event.coordinatorId === u.id || n.author.id === u.id
                      );
                      return (
                        <div key={req.id} className="border rounded-md p-3 space-y-2">
                          <p className="text-sm whitespace-pre-wrap">{req.description}</p>
                          {req.priority && <Badge variant="outline" className="text-xs">{req.priority}</Badge>}
                          {req.assignments.length > 0 && (
                            <div className="flex flex-wrap gap-1 text-xs">
                              <span className="text-muted-foreground">Assigned:</span>
                              {req.assignments.map((a) => (
                                <span key={a.userId} className="bg-muted rounded-full px-2 py-0.5">{a.user.displayName}</span>
                              ))}
                            </div>
                          )}
                          {visibleNotes.length > 0 && (
                            <div className="space-y-1 border-t pt-2">
                              {visibleNotes.map((n) => (
                                <div key={n.id} className="text-xs bg-yellow-50 border border-yellow-200 rounded p-2">
                                  <span className="font-medium">{n.author.displayName}:</span> {n.body}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
