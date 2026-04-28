"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { upsertAgendaItemAction, deleteAgendaItemAction } from "@/server/actions/agenda";
import { format } from "date-fns";

type AgendaItem = {
  id: string; sequence: number; startTime: Date; endTime: Date;
  description: string;
  venueId: string | null; venueText: string | null;
  venue: { id: string; name: string } | null;
};
type Venue = { id: string; name: string };

function toLocalISOString(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AgendaEditor({ eventId, agendaItems, venues }: { eventId: string; agendaItems: AgendaItem[]; venues: Venue[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const nextSeq = agendaItems.length ? Math.max(...agendaItems.map((i) => i.sequence)) + 1 : 1;

  function submit(seq: number) {
    return (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);
      const fd = new FormData(e.currentTarget);
      fd.set("sequence", String(seq));
      startTransition(async () => {
        const r = await upsertAgendaItemAction(eventId, fd);
        if (r.ok) { setShowAdd(false); setEditId(null); }
        else setError(r.error);
      });
    };
  }

  function del(id: string) {
    startTransition(async () => {
      await deleteAgendaItemAction(id, eventId);
    });
  }

  return (
    <div className="space-y-4">
      {agendaItems.map((item) => (
        <Card key={item.id}>
          <CardContent className="py-3">
            {editId === item.id ? (
              <ItemForm
                item={item} venues={venues} seq={item.sequence}
                onSubmit={submit(item.sequence)} pending={pending}
                onCancel={() => setEditId(null)} error={error}
              />
            ) : (
              <div className="flex flex-wrap items-start gap-4">
                <span className="text-xs font-mono bg-muted rounded px-2 py-1">{item.sequence}</span>
                <div className="flex-1">
                  <p className="font-medium">{item.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(item.startTime, "HH:mm")} – {format(item.endTime, "HH:mm")}
                    {(item.venue?.name ?? item.venueText) && ` · ${item.venue?.name ?? item.venueText}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditId(item.id)}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => del(item.id)} disabled={pending}>Delete</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {showAdd ? (
        <Card>
          <CardContent className="py-3">
            <ItemForm
              venues={venues} seq={nextSeq}
              onSubmit={submit(nextSeq)} pending={pending}
              onCancel={() => setShowAdd(false)} error={error}
            />
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setShowAdd(true)}>+ Add agenda item</Button>
      )}
    </div>
  );
}

function ItemForm({
  item, venues, seq, onSubmit, pending, onCancel, error,
}: {
  item?: AgendaItem; venues: Venue[]; seq: number;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  pending: boolean; onCancel: () => void; error: string | null;
}) {
  function toLocalISOString(d: Date) {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1">
          <Label className="text-xs">Description *</Label>
          <Input name="description" defaultValue={item?.description} required />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Start time *</Label>
          <Input name="startTime" type="datetime-local" defaultValue={item ? toLocalISOString(item.startTime) : ""} required />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">End time *</Label>
          <Input name="endTime" type="datetime-local" defaultValue={item ? toLocalISOString(item.endTime) : ""} required />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Venue</Label>
          <select name="venueId" className="h-10 w-full rounded-md border border-input px-3 text-sm" defaultValue={item?.venueId ?? ""}>
            <option value="">— none / custom —</option>
            {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">Custom venue (if no selection above)</Label>
          <Input name="venueText" defaultValue={item?.venueText ?? ""} />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>{pending ? "…" : "Save"}</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
