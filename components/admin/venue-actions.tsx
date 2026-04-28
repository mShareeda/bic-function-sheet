"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { createVenueAction, toggleVenueActiveAction } from "@/server/actions/admin";

type Venue = { id: string; name: string; isActive: boolean };

export function VenueActions({ venues }: { venues: Venue[] }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmAddOpen, setConfirmAddOpen] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState<Venue | null>(null);
  const [pending, startTransition] = useTransition();

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setConfirmAddOpen(true);
  }

  function confirmAdd() {
    startTransition(async () => {
      const r = await createVenueAction(name);
      if (r.ok) {
        setName("");
        setConfirmAddOpen(false);
        setSuccess(`Venue "${name}" added.`);
        setTimeout(() => setSuccess(null), 4000);
      } else {
        setConfirmAddOpen(false);
        setError(r.error);
      }
    });
  }

  function confirmToggleVenue() {
    if (!confirmToggle) return;
    const venue = confirmToggle;
    startTransition(async () => {
      await toggleVenueActiveAction(venue.id);
      setConfirmToggle(null);
      setSuccess(`Venue "${venue.name}" ${venue.isActive ? "disabled" : "enabled"}.`);
      setTimeout(() => setSuccess(null), 4000);
    });
  }

  return (
    <>
      <ConfirmDialog
        open={confirmAddOpen}
        onOpenChange={setConfirmAddOpen}
        title="Add venue?"
        description={`Add venue "${name}" to the list?`}
        confirmLabel="Add"
        onConfirm={confirmAdd}
        pending={pending}
      />
      <ConfirmDialog
        open={!!confirmToggle}
        onOpenChange={(o) => { if (!o) setConfirmToggle(null); }}
        title={confirmToggle?.isActive ? "Disable venue?" : "Enable venue?"}
        description={
          confirmToggle?.isActive
            ? `Disable "${confirmToggle.name}"? It will no longer appear in agenda item dropdowns.`
            : `Enable "${confirmToggle?.name}"? It will become available in agenda item dropdowns again.`
        }
        confirmLabel={confirmToggle?.isActive ? "Disable" : "Enable"}
        destructive={confirmToggle?.isActive}
        onConfirm={confirmToggleVenue}
        pending={pending}
      />

      <div className="space-y-4">
        {success && <p className="text-sm text-green-600">{success}</p>}
        <form onSubmit={onAdd} className="flex items-center gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New venue name"
            className="w-52"
            required
          />
          {error && <span className="text-sm text-destructive">{error}</span>}
          <Button type="submit" size="sm" disabled={pending}>{pending ? "…" : "Add"}</Button>
        </form>
        <div className="grid gap-2">
          {venues.map((v) => (
            <div key={v.id} className="flex items-center justify-between rounded-lg border px-4 py-2">
              <span className={`text-sm font-medium ${!v.isActive ? "text-muted-foreground line-through" : ""}`}>{v.name}</span>
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => setConfirmToggle(v)}
              >
                {v.isActive ? "Disable" : "Enable"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
