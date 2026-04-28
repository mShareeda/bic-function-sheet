import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  canEditEvent,
  canViewFullFunctionSheet,
  isAdmin,
  hasRole,
} from "@/lib/authz";
import type { SessionUser } from "@/lib/authz";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { VipBadge } from "@/components/ui/vip-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import {
  Pencil,
  CalendarRange,
  Building2,
  ListChecks,
  FileDown,
  ScrollText,
  Calendar,
  Paperclip,
  Users,
} from "lucide-react";
import { StatusChanger } from "@/components/events/status-changer";
import { AttachmentPanel } from "@/components/events/attachment-panel";

export default async function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
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
              assignments: {
                include: { user: { select: { id: true, displayName: true } } },
              },
              managerNotes: {
                include: { author: { select: { id: true, displayName: true } } },
              },
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
  const canFullView = canViewFullFunctionSheet(
    u,
    event,
    managedDeptIds,
    eventDeptIds,
  );

  const assignedReqIds = new Set<string>();
  if (!canFullView && hasRole(u, "DEPT_TEAM_MEMBER")) {
    const assignments = await prisma.requirementAssignment.findMany({
      where: { userId: u.id, requirement: { eventId } },
      select: { requirementId: true },
    });
    assignments.forEach((a) => assignedReqIds.add(a.requirementId));
  }

  const facts: [string, string | null | undefined][] = [
    ["Client", event.clientName],
    ["Client contact", event.clientContact],
    ["Coordinator", event.coordinator?.displayName],
    ["Salesperson", event.salespersonName],
    ["Maximizer #", event.maximizerNumber],
    ["Estimated guests", event.estimatedGuests?.toString()],
    [
      "Confirmation received",
      event.confirmationReceived
        ? format(event.confirmationReceived, "d MMM yyyy")
        : null,
    ],
  ];
  const visibleFacts = facts.filter(([, v]) => v);

  const showRequirements =
    (canFullView || assignedReqIds.size > 0) && event.departments.length > 0;

  return (
    <div className="space-y-6">
      <div
        className={`glass-strong sticky top-14 z-20 -mx-4 lg:-mx-8 px-4 lg:px-8 py-4 border-b backdrop-blur-glass-strong ${
          event.isVip ? "border-vip/60 ring-1 ring-vip/30" : "border-border/40"
        }`}
      >
        {event.isVip && (
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-vip via-vip/80 to-vip"
          />
        )}
        <div className="mx-auto flex max-w-7xl flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Function sheet
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="text-h1 truncate">{event.title}</h1>
              {event.isVip && <VipBadge size="md" />}
              <StatusBadge status={event.status} size="md" />
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarRange className="h-3.5 w-3.5" />
              {format(event.eventDate, "EEEE, d MMMM yyyy")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <Button asChild size="sm" variant="outline">
                <Link href={`/events/${eventId}/edit`}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Link>
              </Button>
            )}
            {canFullView && (
              <Button asChild size="sm" variant="outline">
                <Link href={`/events/${eventId}/pdf`} target="_blank">
                  <FileDown className="h-3.5 w-3.5" />
                  PDF
                </Link>
              </Button>
            )}
            {canEdit && (
              <StatusChanger eventId={eventId} currentStatus={event.status} />
            )}
            {canEdit && (
              <Button asChild size="sm" variant="ghost">
                <Link href={`/events/${eventId}/audit`}>
                  <ScrollText className="h-3.5 w-3.5" />
                  Audit
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">
            <Calendar className="mr-1.5 h-3.5 w-3.5" />
            Overview
          </TabsTrigger>
          {event.agendaItems.length > 0 && (
            <TabsTrigger value="agenda">
              <ListChecks className="mr-1.5 h-3.5 w-3.5" />
              Agenda
              <span className="ml-1.5 rounded-full bg-muted px-1.5 text-[10px] tabular-nums">
                {event.agendaItems.length}
              </span>
            </TabsTrigger>
          )}
          {showRequirements && (
            <TabsTrigger value="departments">
              <Building2 className="mr-1.5 h-3.5 w-3.5" />
              Departments
              <span className="ml-1.5 rounded-full bg-muted px-1.5 text-[10px] tabular-nums">
                {event.departments.length}
              </span>
            </TabsTrigger>
          )}
          {(canEdit || event.attachments.length > 0) && (
            <TabsTrigger value="attachments">
              <Paperclip className="mr-1.5 h-3.5 w-3.5" />
              Attachments
              {event.attachments.length > 0 && (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 text-[10px] tabular-nums">
                  {event.attachments.length}
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Schedule</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 text-sm sm:grid-cols-3">
                  {(
                    [
                      ["Setup", event.setupStart, event.setupEnd, "primary"],
                      ["Live event", event.liveStart, event.liveEnd, "live"],
                      [
                        "Breakdown",
                        event.breakdownStart,
                        event.breakdownEnd,
                        "muted",
                      ],
                    ] as [string, Date, Date, string][]
                  ).map(([label, start, end, tone]) => (
                    <div
                      key={label}
                      className="glass-subtle rounded-md p-3 space-y-1"
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            tone === "primary"
                              ? "bg-primary"
                              : tone === "live"
                              ? "bg-status-live"
                              : "bg-muted-foreground/40"
                          }`}
                        />
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {label}
                        </p>
                      </div>
                      <p className="font-semibold tabular-nums">
                        {format(start, "HH:mm")} – {format(end, "HH:mm")}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {canEdit && (
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/events/${eventId}/agenda`}>
                      Edit agenda
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/events/${eventId}/departments`}>
                      Manage departments
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/events/${eventId}/requirements`}>
                      Edit requirements
                    </Link>
                  </Button>
                </div>
              )}
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick facts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {visibleFacts.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No additional details.</p>
                ) : (
                  visibleFacts.map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {label}
                      </p>
                      <p className="font-medium">{value}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {event.agendaItems.length > 0 && (
          <TabsContent value="agenda">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/40 text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="py-3 px-4 text-left font-medium">#</th>
                        <th className="py-3 px-4 text-left font-medium">Time</th>
                        <th className="py-3 px-4 text-left font-medium">
                          Description
                        </th>
                        <th className="py-3 px-4 text-left font-medium">Venue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {event.agendaItems.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-border/30 transition-colors last:border-0 hover:bg-surface/40"
                        >
                          <td className="py-2.5 px-4 tabular-nums text-muted-foreground">
                            {item.sequence}
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap tabular-nums">
                            {format(item.startTime, "HH:mm")} –{" "}
                            {format(item.endTime, "HH:mm")}
                          </td>
                          <td className="py-2.5 px-4">{item.description}</td>
                          <td className="py-2.5 px-4 text-muted-foreground">
                            {item.venue?.name ?? item.venueText ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {showRequirements && (
          <TabsContent value="departments" className="space-y-4">
            {event.departments.map((ed) => {
              const reqs = canFullView
                ? ed.requirements
                : ed.requirements.filter((r) => assignedReqIds.has(r.id));
              if (!canFullView && reqs.length === 0) return null;

              return (
                <Card key={ed.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {ed.department.name}
                      </CardTitle>
                      {(canEdit || managedDeptIds.includes(ed.departmentId)) && (
                        <Button asChild size="sm" variant="ghost">
                          <Link
                            href={`/events/${eventId}/requirements/${ed.departmentId}`}
                          >
                            Edit
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {reqs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No requirements yet.
                      </p>
                    ) : (
                      reqs.map((req) => {
                        const visibleNotes = req.managerNotes.filter(
                          (n) =>
                            isAdmin(u) ||
                            event.coordinatorId === u.id ||
                            n.author.id === u.id,
                        );
                        const priorityClass =
                          req.priority === "HIGH" || req.priority === "URGENT"
                            ? "border-l-destructive"
                            : req.priority === "MEDIUM"
                            ? "border-l-accent"
                            : "border-l-border";
                        return (
                          <div
                            key={req.id}
                            className={`glass-subtle rounded-md border-l-4 p-3 space-y-2 ${priorityClass}`}
                          >
                            <p className="text-sm whitespace-pre-wrap">
                              {req.description}
                            </p>
                            {req.priority && (
                              <Badge variant="outline" className="text-xs">
                                {req.priority}
                              </Badge>
                            )}
                            {req.assignments.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1 text-xs">
                                <Users className="h-3 w-3 text-muted-foreground" />
                                {req.assignments.map((a) => (
                                  <span
                                    key={a.userId}
                                    className="rounded-full bg-primary/10 text-primary px-2 py-0.5"
                                  >
                                    {a.user.displayName}
                                  </span>
                                ))}
                              </div>
                            )}
                            {visibleNotes.length > 0 && (
                              <div className="space-y-1 border-t border-border/40 pt-2">
                                {visibleNotes.map((n) => (
                                  <div
                                    key={n.id}
                                    className="rounded-md border border-accent/30 bg-accent/10 p-2 text-xs"
                                  >
                                    <span className="font-medium">
                                      {n.author.displayName}:
                                    </span>{" "}
                                    {n.body}
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
          </TabsContent>
        )}

        {(canEdit || event.attachments.length > 0) && (
          <TabsContent value="attachments">
            <Card>
              <CardContent className="p-6">
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
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
