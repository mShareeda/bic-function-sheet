"use client";

// ── TemplateForm ───────────────────────────────────────────────────────────────
// Used by /recurring/new and /recurring/[id]/edit.
// Manages template fields + dynamic dept + agenda lists.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createTemplateAction,
  updateTemplateAction,
  type TemplatePayload,
  type TemplateDept,
  type TemplateAgendaItem,
} from "@/server/actions/templates";

// Department row option provided by the server page
export type DeptOption = {
  id: string;
  name: string;
};

interface TemplateFormProps {
  deptOptions: DeptOption[];
  /** When provided → edit mode */
  templateId?: string;
  initialTitle?: string;
  initialDescription?: string;
  initialEventType?: string;
  initialIsVip?: boolean;
  initialEstimatedGuests?: number | null;
  initialSalespersonName?: string | null;
  initialDepartments?: TemplateDept[];
  initialAgendaItems?: TemplateAgendaItem[];
}

const EVENT_TYPES = [
  { value: "", label: "— No type —" },
  { value: "race_day", label: "Race day" },
  { value: "corporate_hospitality", label: "Corporate hospitality" },
  { value: "track_day", label: "Track day" },
  { value: "testing_session", label: "Testing session" },
  { value: "concert_entertainment", label: "Concert / entertainment" },
  { value: "private_function", label: "Private function" },
  { value: "media_event", label: "Media event" },
  { value: "charity_event", label: "Charity event" },
  { value: "exhibition", label: "Exhibition" },
  { value: "conference", label: "Conference / seminar" },
];

export function TemplateForm({
  deptOptions,
  templateId,
  initialTitle = "",
  initialDescription = "",
  initialEventType = "",
  initialIsVip = false,
  initialEstimatedGuests = null,
  initialSalespersonName = "",
  initialDepartments = [],
  initialAgendaItems = [],
}: TemplateFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // ── Form state ──────────────────────────────────────────────────────
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [eventType, setEventType] = useState(initialEventType);
  const [isVip, setIsVip] = useState(initialIsVip);
  const [estimatedGuests, setEstimatedGuests] = useState(
    initialEstimatedGuests?.toString() ?? "",
  );
  const [salespersonName, setSalespersonName] = useState(initialSalespersonName ?? "");

  // Departments list
  const [depts, setDepts] = useState<TemplateDept[]>(initialDepartments);

  // Agenda items list
  const [agendaItems, setAgendaItems] = useState<TemplateAgendaItem[]>(
    initialAgendaItems,
  );

  // ── Department helpers ──────────────────────────────────────────────

  function addDept(deptId: string) {
    const opt = deptOptions.find((d) => d.id === deptId);
    if (!opt || depts.some((d) => d.departmentId === deptId)) return;
    setDepts((prev) => [
      ...prev,
      { departmentId: opt.id, departmentName: opt.name, requirements: "" },
    ]);
  }

  function removeDept(deptId: string) {
    setDepts((prev) => prev.filter((d) => d.departmentId !== deptId));
  }

  function updateDeptReqs(deptId: string, requirements: string) {
    setDepts((prev) =>
      prev.map((d) => (d.departmentId === deptId ? { ...d, requirements } : d)),
    );
  }

  // ── Agenda helpers ──────────────────────────────────────────────────

  function addAgendaItem() {
    const seq = agendaItems.length + 1;
    setAgendaItems((prev) => [
      ...prev,
      { sequence: seq, startTime: "08:00", endTime: "09:00", description: "", venueText: null },
    ]);
  }

  function removeAgendaItem(idx: number) {
    setAgendaItems((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.map((item, i) => ({ ...item, sequence: i + 1 }));
    });
  }

  function updateAgendaItem(
    idx: number,
    field: keyof TemplateAgendaItem,
    value: string,
  ) {
    setAgendaItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
    );
  }

  // ── Submit ──────────────────────────────────────────────────────────

  function submit() {
    setError(null);
    const payload: TemplatePayload = {
      title,
      description: description || undefined,
      eventType: eventType || undefined,
      isVip,
      estimatedGuests: estimatedGuests ? parseInt(estimatedGuests) : null,
      salespersonName: salespersonName || undefined,
      departments: depts,
      agendaItems: agendaItems.map((a) => ({
        ...a,
        sequence: a.sequence,
      })),
    };

    startTransition(async () => {
      const result = templateId
        ? await updateTemplateAction(templateId, payload)
        : await createTemplateAction(payload);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push(templateId ? `/recurring/${templateId}` : `/recurring/${result.id}`);
    });
  }

  const unselectedDepts = deptOptions.filter(
    (d) => !depts.some((sd) => sd.departmentId === d.id),
  );

  return (
    <div className="space-y-6">
      {error && (
        <div role="alert" className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ── Details ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Template details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="title">Template name *</Label>
            <Input
              id="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Corporate Hospitality — Standard"
            />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px] resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="When to use this template, any notes…"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="eventType">Event type</Label>
            <select
              id="eventType"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
            >
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="estimatedGuests">Estimated guests</Label>
            <Input
              id="estimatedGuests"
              type="number"
              min={0}
              value={estimatedGuests}
              onChange={(e) => setEstimatedGuests(e.target.value)}
              placeholder="e.g. 200"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="salespersonName">Salesperson</Label>
            <Input
              id="salespersonName"
              value={salespersonName}
              onChange={(e) => setSalespersonName(e.target.value)}
              placeholder="Default salesperson for this type"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <input
              id="isVip"
              type="checkbox"
              className="h-4 w-4 rounded border-input accent-primary"
              checked={isVip}
              onChange={(e) => setIsVip(e.target.checked)}
            />
            <Label htmlFor="isVip" className="cursor-pointer">
              VIP / Dignitary event template
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* ── Departments ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Departments</CardTitle>
            {unselectedDepts.length > 0 && (
              <select
                className="text-xs rounded-md border border-input bg-background px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) addDept(e.target.value);
                  e.target.value = "";
                }}
              >
                <option value="">+ Add department</option>
                {unselectedDepts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {depts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No departments added yet. Use the dropdown above to add departments.
            </p>
          ) : (
            depts.map((dept) => (
              <div key={dept.departmentId} className="glass-subtle rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{dept.departmentName}</p>
                  <button
                    type="button"
                    onClick={() => removeDept(dept.departmentId)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    aria-label={`Remove ${dept.departmentName}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Requirements template</Label>
                  <textarea
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px] resize-y"
                    value={dept.requirements ?? ""}
                    onChange={(e) => updateDeptReqs(dept.departmentId, e.target.value)}
                    placeholder="List the typical requirements for this department…"
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* ── Agenda Items ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Agenda items</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={addAgendaItem}>
              <Plus className="h-3.5 w-3.5" />
              Add item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {agendaItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No agenda items yet. These will be pre-populated when creating an event from this template.
            </p>
          ) : (
            agendaItems.map((item, idx) => (
              <div
                key={idx}
                className="glass-subtle rounded-lg p-3 grid gap-2 sm:grid-cols-[auto_1fr_1fr_2fr_auto]"
              >
                <div className="flex items-center text-muted-foreground">
                  <GripVertical className="h-4 w-4" />
                  <span className="text-xs font-mono ml-1">{item.sequence}</span>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Start</Label>
                  <Input
                    type="time"
                    value={item.startTime}
                    onChange={(e) => updateAgendaItem(idx, "startTime", e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End</Label>
                  <Input
                    type="time"
                    value={item.endTime}
                    onChange={(e) => updateAgendaItem(idx, "endTime", e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Input
                    value={item.description}
                    onChange={(e) => updateAgendaItem(idx, "description", e.target.value)}
                    placeholder="Activity description"
                    className="text-xs h-8"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeAgendaItem(idx)}
                    className="text-muted-foreground hover:text-destructive transition-colors mb-0.5"
                    aria-label="Remove agenda item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* ── Actions ── */}
      <div className="flex gap-3">
        <Button onClick={submit} disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {templateId ? "Save changes" : "Create template"}
        </Button>
        <Button
          variant="ghost"
          onClick={() => router.push(templateId ? `/recurring/${templateId}` : "/recurring")}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
