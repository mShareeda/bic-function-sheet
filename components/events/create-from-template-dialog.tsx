"use client";

// ── CreateFromTemplateDialog ──────────────────────────────────────────────────
// Shown on the template detail page. Collects date / times from the coordinator
// then calls createEventFromTemplateAction to instantiate the template.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createEventFromTemplateAction,
  type TemplateRecord,
} from "@/server/actions/templates";

interface Props {
  template: TemplateRecord;
  coordinators: { id: string; displayName: string }[];
}

export function CreateFromTemplateDialog({ template, coordinators }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState(template.title);
  const [eventDate, setEventDate] = useState("");
  const [coordinatorId, setCoordinatorId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientContact, setClientContact] = useState("");

  // Default schedule times — take from first template agenda item if available,
  // otherwise sensible BIC defaults.
  const firstAgenda = template.agendaItems[0];
  const [setupStart, setSetupStart] = useState(
    template.agendaItems.length > 0 ? firstAgenda.startTime : "06:00",
  );
  const [setupEnd, setSetupEnd] = useState("08:00");
  const [liveStart, setLiveStart] = useState("08:00");
  const [liveEnd, setLiveEnd] = useState("18:00");
  const [breakdownStart, setBreakdownStart] = useState("18:00");
  const [breakdownEnd, setBreakdownEnd] = useState("22:00");

  function submit() {
    if (!eventDate) {
      setError("Please select an event date.");
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await createEventFromTemplateAction({
        templateId: template.id,
        title,
        eventDate,
        coordinatorId: coordinatorId || undefined,
        clientName: clientName || undefined,
        clientContact: clientContact || undefined,
        setupStart,
        setupEnd,
        liveStart,
        liveEnd,
        breakdownStart,
        breakdownEnd,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push(`/events/${result.id}`);
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <CalendarPlus className="h-4 w-4" />
        Create event from template
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Create event from template"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div
            className="relative z-10 w-full max-w-lg rounded-xl shadow-glass-lg animate-fade-in-up"
            style={{
              background: "hsl(var(--surface-strong) / 0.95)",
              backdropFilter: "blur(20px) saturate(150%)",
              border: "1px solid hsl(var(--border) / 0.6)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
              <div>
                <h2 className="text-base font-semibold">Create event from template</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Using: <span className="font-medium">{template.title}</span>
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4 overflow-y-auto max-h-[70vh]">
              {error && (
                <div role="alert" className="rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="cf-title">Event name *</Label>
                  <Input
                    id="cf-title"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cf-date">Event date *</Label>
                  <Input
                    id="cf-date"
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cf-coord">Coordinator</Label>
                  <select
                    id="cf-coord"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={coordinatorId}
                    onChange={(e) => setCoordinatorId(e.target.value)}
                  >
                    <option value="">— Assign later —</option>
                    {coordinators.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cf-client">Client name</Label>
                  <Input
                    id="cf-client"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Confidential"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cf-contact">Client contact</Label>
                  <Input
                    id="cf-contact"
                    value={clientContact}
                    onChange={(e) => setClientContact(e.target.value)}
                    placeholder="Confidential"
                  />
                </div>
              </div>

              {/* Schedule */}
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Schedule (all times on event date)
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(
                    [
                      ["Setup", setupStart, setSetupStart, setupEnd, setSetupEnd],
                      ["Live event", liveStart, setLiveStart, liveEnd, setLiveEnd],
                      ["Breakdown", breakdownStart, setBreakdownStart, breakdownEnd, setBreakdownEnd],
                    ] as [
                      string,
                      string,
                      (v: string) => void,
                      string,
                      (v: string) => void,
                    ][]
                  ).map(([label, start, setStart, end, setEnd]) => (
                    <div key={label} className="glass-subtle rounded-lg p-3 space-y-2">
                      <p className="text-xs font-medium">{label}</p>
                      <div className="flex items-center gap-1 text-xs">
                        <input
                          type="time"
                          value={start}
                          onChange={(e) => setStart(e.target.value)}
                          className="w-full rounded border border-input bg-transparent px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        <span className="text-muted-foreground flex-shrink-0">→</span>
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

              {/* Template summary */}
              <div className="rounded-lg border border-border/40 bg-surface/30 px-4 py-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground/80 mb-1.5">What will be pre-filled from the template:</p>
                <p>✓ {template.departments.length} department{template.departments.length !== 1 ? "s" : ""} + requirements</p>
                <p>✓ {template.agendaItems.length} agenda item{template.agendaItems.length !== 1 ? "s" : ""}</p>
                {template.isVip && <p>✓ Marked as VIP event</p>}
                {template.estimatedGuests && <p>✓ {template.estimatedGuests} estimated guests</p>}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border/40">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={pending}>
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarPlus className="h-4 w-4" />
                )}
                Create event
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
