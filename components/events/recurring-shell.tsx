"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Search, Plus, ChevronLeft, Building2, Clock, Pencil, Trash2,
  Loader2, CalendarPlus, Check, Star, ListChecks, Save, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import {
  updateTemplateDepartmentsAction,
  createEventFromTemplateAction,
  deleteTemplateAction,
  type TemplateDept,
  type TemplateAgendaItem,
} from "@/server/actions/templates";

// ── Types ─────────────────────────────────────────────────────────────────────

export type TemplateItem = {
  id: string;
  title: string;
  description: string | null;
  eventType: string | null;
  isVip: boolean;
  estimatedGuests: number | null;
  salespersonName: string | null;
  departments: TemplateDept[];
  agendaItems: TemplateAgendaItem[];
  createdById: string;
  createdByName: string;
  updatedAt: string;
};

interface RecurringShellProps {
  templates: TemplateItem[];
  coordinators: { id: string; displayName: string }[];
  currentUserId: string;
  isAdmin: boolean;
}

// ── Shell ─────────────────────────────────────────────────────────────────────

export function RecurringShell({
  templates,
  coordinators,
  currentUserId,
  isAdmin,
}: RecurringShellProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = React.useState<string | null>(
    templates.length === 1 ? templates[0]!.id : null,
  );
  const [search, setSearch] = React.useState("");
  const [mobileView, setMobileView] = React.useState<"list" | "detail">("list");

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.eventType?.toLowerCase().includes(q),
    );
  }, [templates, search]);

  const selected = templates.find((t) => t.id === selectedId) ?? null;

  function pick(id: string) {
    setSelectedId(id);
    setMobileView("detail");
  }

  function onDeleted() {
    setSelectedId(null);
    setMobileView("list");
    router.refresh();
  }

  const sidebar = (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates…"
          className="pl-8 h-8 text-sm"
        />
      </div>
      <Button asChild size="sm" className="w-full">
        <Link href="/recurring/new">
          <Plus className="h-3.5 w-3.5" /> New template
        </Link>
      </Button>
    </div>
  );

  const list =
    filtered.length === 0 ? (
      <p className="text-xs text-muted-foreground text-center py-6">
        {search ? "No templates match." : "No templates yet."}
      </p>
    ) : (
      <div className="space-y-1">
        {filtered.map((tmpl) => (
          <TemplateListItem
            key={tmpl.id}
            template={tmpl}
            selected={selectedId === tmpl.id}
            onClick={() => pick(tmpl.id)}
          />
        ))}
      </div>
    );

  return (
    <>
      {/* ── Desktop two-panel ── */}
      <div className="hidden lg:flex gap-6 items-start">
        <aside className="w-60 xl:w-72 shrink-0 sticky top-4 space-y-3">
          {sidebar}
          <div
            className="overflow-y-auto"
            style={{ maxHeight: "calc(100svh - 13rem)" }}
          >
            {list}
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          {selected ? (
            <TemplateDetailPanel
              key={selected.id}
              template={selected}
              coordinators={coordinators}
              canEdit={isAdmin || selected.createdById === currentUserId}
              onDeleted={onDeleted}
              onSaved={() => router.refresh()}
            />
          ) : (
            <EmptyState hasTemplates={templates.length > 0} />
          )}
        </div>
      </div>

      {/* ── Mobile toggle ── */}
      <div className="lg:hidden space-y-4">
        {mobileView === "list" ? (
          <>
            {sidebar}
            {list}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setMobileView("list")}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              All templates
            </button>
            {selected && (
              <TemplateDetailPanel
                key={selected.id}
                template={selected}
                coordinators={coordinators}
                canEdit={isAdmin || selected.createdById === currentUserId}
                onDeleted={onDeleted}
                onSaved={() => router.refresh()}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}

// ── Template list item ────────────────────────────────────────────────────────

function TemplateListItem({
  template,
  selected,
  onClick,
}: {
  template: TemplateItem;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg px-3 py-2.5 border transition-colors",
        selected
          ? "bg-primary/10 border-primary/25"
          : "border-transparent hover:bg-muted/50",
      )}
    >
      <p className="text-sm font-medium truncate leading-snug">
        {template.title}
        {template.isVip && (
          <Star className="inline h-3 w-3 text-vip fill-vip ml-1 mb-0.5" />
        )}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">
        {template.departments.length} dept{template.departments.length !== 1 ? "s" : ""}
        {template.agendaItems.length > 0 &&
          ` · ${template.agendaItems.length} agenda`}
      </p>
    </button>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ hasTemplates }: { hasTemplates: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-24 text-center gap-3">
      <ListChecks className="h-10 w-10 text-muted-foreground/30" />
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          {hasTemplates ? "Select a template" : "No templates yet"}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          {hasTemplates
            ? "Pick one from the list to view and create an event."
            : "Create a template to speed up recurring event setup."}
        </p>
      </div>
      {!hasTemplates && (
        <Button asChild variant="outline" size="sm">
          <Link href="/recurring/new">
            <Plus className="h-3.5 w-3.5" /> New template
          </Link>
        </Button>
      )}
    </div>
  );
}

// ── Template detail panel ─────────────────────────────────────────────────────

function TemplateDetailPanel({
  template,
  coordinators,
  canEdit,
  onDeleted,
  onSaved,
}: {
  template: TemplateItem;
  coordinators: { id: string; displayName: string }[];
  canEdit: boolean;
  onDeleted: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = React.useTransition();

  // Requirements state (initialized from template, editable)
  const [deptReqs, setDeptReqs] = React.useState<TemplateDept[]>(template.departments);
  const [reqsDirty, setReqsDirty] = React.useState(false);
  const [savingReqs, setSavingReqs] = React.useState(false);

  // Create event form
  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  const [eventDate, setEventDate] = React.useState("");
  const [coordId, setCoordId] = React.useState("");
  const [clientName, setClientName] = React.useState("");
  const [clientContact, setClientContact] = React.useState("");
  const [setupStart, setSetupStart] = React.useState("06:00");
  const [setupEnd, setSetupEnd] = React.useState("08:00");
  const [liveStart, setLiveStart] = React.useState("08:00");
  const [liveEnd, setLiveEnd] = React.useState("18:00");
  const [breakdownStart, setBreakdownStart] = React.useState("18:00");
  const [breakdownEnd, setBreakdownEnd] = React.useState("22:00");
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [agendaExpanded, setAgendaExpanded] = React.useState(false);

  function updateReq(deptId: string, value: string) {
    setDeptReqs((prev) =>
      prev.map((d) => (d.departmentId === deptId ? { ...d, requirements: value } : d)),
    );
    setReqsDirty(true);
  }

  async function saveRequirements() {
    setSavingReqs(true);
    const result = await updateTemplateDepartmentsAction(template.id, deptReqs);
    setSavingReqs(false);
    if (result.ok) {
      setReqsDirty(false);
      toast({ kind: "success", title: "Requirements saved to template" });
      onSaved();
    } else {
      toast({ kind: "error", title: "Save failed", description: result.error });
    }
  }

  type SendMode = "draft" | "full" | "provisional";

  function createEvent(sendMode: SendMode) {
    if (!eventDate) {
      setCreateError("Please select an event date.");
      return;
    }
    setCreateError(null);

    startTransition(async () => {
      // Save current requirements to template so they persist for next time
      const saveResult = await updateTemplateDepartmentsAction(template.id, deptReqs);
      if (saveResult.ok) setReqsDirty(false);

      // Create event — pass current requirements as overrides so even if
      // the DB save failed we still use the coordinator's edited values
      const result = await createEventFromTemplateAction({
        templateId: template.id,
        title: template.title,
        eventDate,
        coordinatorId: coordId || undefined,
        clientName: clientName || undefined,
        clientContact: clientContact || undefined,
        setupStart,
        setupEnd,
        liveStart,
        liveEnd,
        breakdownStart,
        breakdownEnd,
        sendMode,
        departmentRequirements: deptReqs.map((d) => ({
          departmentId: d.departmentId,
          requirements: d.requirements,
        })),
      });

      if (!result.ok) {
        setCreateError(result.error);
        return;
      }

      const labels: Record<SendMode, string> = {
        draft: "Event saved as draft",
        full: "Function sheet sent",
        provisional: "Provisional sheet sent",
      };
      toast({ kind: "success", title: labels[sendMode], description: template.title });
      router.push(`/events/${result.id}`);
    });
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-h2 truncate">{template.title}</h2>
            {template.isVip && (
              <span className="text-xs font-semibold text-vip bg-vip/10 ring-1 ring-vip/20 rounded-full px-2 py-0.5">
                ★ VIP
              </span>
            )}
          </div>
          {template.description && (
            <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Updated {format(new Date(template.updatedAt), "d MMM yyyy")}
            {template.estimatedGuests ? ` · ${template.estimatedGuests} est. guests` : ""}
          </p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2 shrink-0">
            <Button asChild variant="outline" size="sm">
              <Link href={`/recurring/${template.id}/edit`}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={async () => {
                if (!confirm(`Delete template "${template.title}"? This cannot be undone.`)) return;
                await deleteTemplateAction(template.id);
                onDeleted();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* ── Create event form ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarPlus className="h-4 w-4 text-muted-foreground" />
            Create event from this template
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {createError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {createError}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Event date *">
              <Input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                min={today}
              />
            </FormField>

            <FormField label="Coordinator">
              <select
                value={coordId}
                onChange={(e) => setCoordId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-border/60 bg-surface/50 backdrop-blur-glass px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              >
                <option value="">— Unassigned —</option>
                {coordinators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Client name">
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Confidential"
              />
            </FormField>

            <FormField label="Client contact">
              <Input
                value={clientContact}
                onChange={(e) => setClientContact(e.target.value)}
                placeholder="Confidential"
              />
            </FormField>
          </div>

          {/* Schedule */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Schedule (all times on event date)
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  ["Setup", setupStart, setSetupStart, setupEnd, setSetupEnd],
                  ["Live event", liveStart, setLiveStart, liveEnd, setLiveEnd],
                  ["Breakdown", breakdownStart, setBreakdownStart, breakdownEnd, setBreakdownEnd],
                ] as [string, string, React.Dispatch<React.SetStateAction<string>>, string, React.Dispatch<React.SetStateAction<string>>][]
              ).map(([label, start, setStart, end, setEnd]) => (
                <div key={label} className="glass-subtle rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium">{label}</p>
                  <div className="flex items-center gap-1">
                    <input
                      type="time"
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                      className="w-full rounded border border-input bg-transparent px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <span className="text-muted-foreground text-xs shrink-0">→</span>
                    <input
                      type="time"
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                      className="w-full rounded border border-input bg-transparent px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Send buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => createEvent("draft")}
              disabled={pending}
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save as draft
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => createEvent("provisional")}
              disabled={pending}
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Send provisional
            </Button>
            <Button
              size="sm"
              onClick={() => createEvent("full")}
              disabled={pending}
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarPlus className="h-3.5 w-3.5" />}
              Send function sheet
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Department requirements ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Department requirements
              {reqsDirty && (
                <span className="text-xs font-normal text-amber-500 bg-amber-500/10 rounded-full px-2 py-0.5">
                  Unsaved
                </span>
              )}
            </CardTitle>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={saveRequirements}
                disabled={savingReqs || !reqsDirty}
              >
                {savingReqs ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save to template
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            These requirements are pre-filled every time you use this template.
            Edits here are saved back to the template automatically when you create an event.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {deptReqs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No departments on this template. Use{" "}
              <Link
                href={`/recurring/${template.id}/edit`}
                className="underline underline-offset-2"
              >
                Edit template
              </Link>{" "}
              to add departments.
            </p>
          ) : (
            deptReqs.map((dept) => (
              <DeptRequirementRow
                key={dept.departmentId}
                dept={dept}
                readOnly={!canEdit}
                onChange={(v) => updateReq(dept.departmentId, v)}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* ── Agenda ── */}
      {template.agendaItems.length > 0 && (
        <Card>
          <button
            type="button"
            className="w-full text-left px-4 sm:px-6 py-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors rounded-lg"
            onClick={() => setAgendaExpanded((v) => !v)}
          >
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Agenda ({template.agendaItems.length} items)
            </CardTitle>
            <span className="text-muted-foreground text-sm">{agendaExpanded ? "▲" : "▼"}</span>
          </button>
          {agendaExpanded && (
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 px-3 text-left font-medium w-8">#</th>
                      <th className="py-2 px-3 text-left font-medium whitespace-nowrap">Time</th>
                      <th className="py-2 px-3 text-left font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {template.agendaItems.map((item) => (
                      <tr
                        key={item.sequence}
                        className="border-b border-border/30 last:border-0 hover:bg-surface/40 transition-colors"
                      >
                        <td className="py-2 px-3 tabular-nums text-muted-foreground">{item.sequence}</td>
                        <td className="py-2 px-3 whitespace-nowrap tabular-nums font-mono text-xs">
                          {item.startTime}–{item.endTime}
                        </td>
                        <td className="py-2 px-3">{item.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}

// ── Department requirement row ────────────────────────────────────────────────

function DeptRequirementRow({
  dept,
  readOnly,
  onChange,
}: {
  dept: TemplateDept;
  readOnly: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="glass-subtle rounded-lg p-4 space-y-2">
      <p className="text-sm font-semibold">{dept.departmentName}</p>
      {readOnly ? (
        dept.requirements ? (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {dept.requirements}
          </p>
        ) : (
          <p className="text-xs italic text-muted-foreground">No requirements defined.</p>
        )
      ) : (
        <textarea
          value={dept.requirements ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder="Describe what this department needs to deliver…"
          className="w-full rounded-md border border-border/60 bg-surface/50 backdrop-blur-glass px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background resize-y"
        />
      )}
    </div>
  );
}

// ── Shared field wrapper ──────────────────────────────────────────────────────

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}
