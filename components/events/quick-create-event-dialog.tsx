"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { quickCreateEventAction } from "@/server/actions/events";

type Coordinator = { id: string; displayName: string };

export function QuickCreateEventDialog({
  date,
  coordinators,
  onClose,
}: {
  date: string; // yyyy-MM-dd
  coordinators: Coordinator[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [coordinatorId, setCoordinatorId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await quickCreateEventAction(title, date, coordinatorId || null);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      onClose();
      router.push(`/events/${r.id}`);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-lg border bg-card shadow-xl p-6 mx-4 space-y-4 animate-in fade-in-0 zoom-in-95">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">New event</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{date}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="qc-title">Title *</Label>
            <Input
              id="qc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event name…"
              autoFocus
              required
            />
          </div>

          {coordinators.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="qc-coordinator">Coordinator</Label>
              <select
                id="qc-coordinator"
                value={coordinatorId}
                onChange={(e) => setCoordinatorId(e.target.value)}
                className="h-9 w-full rounded-md border border-input px-3 text-sm"
              >
                <option value="">— none —</option>
                {coordinators.map((c) => (
                  <option key={c.id} value={c.id}>{c.displayName}</option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center justify-between gap-2 pt-1">
            <Link
              href={`/events/new?date=${date}`}
              onClick={onClose}
              className="text-xs text-primary hover:underline"
            >
              Full wizard →
            </Link>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={pending || !title.trim()}>
                {pending ? "Creating…" : "Create draft"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
