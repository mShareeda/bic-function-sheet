"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { duplicateEventAction } from "@/server/actions/events";
import { format } from "date-fns";

export function DuplicateEventButton({
  eventId,
  eventTitle,
  eventDate,
}: {
  eventId: string;
  eventTitle: string;
  eventDate: Date;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(`${eventTitle} (copy)`);
  const [date, setDate] = useState(format(eventDate, "yyyy-MM-dd"));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await duplicateEventAction(eventId, title, date);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.push(`/events/${result.id}`);
    });
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Copy className="h-3.5 w-3.5" />
        Duplicate
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border bg-card shadow-xl p-6 mx-4 space-y-4 animate-in fade-in-0 zoom-in-95">
            <h2 className="text-base font-semibold">Duplicate event</h2>
            <p className="text-sm text-muted-foreground">
              Creates a new DRAFT event with all departments and requirements copied.
              Assignments and notes are not transferred.
            </p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="dup-title">New title</Label>
                <Input
                  id="dup-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dup-date">Event date</Label>
                <Input
                  id="dup-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button size="sm" onClick={submit} disabled={pending || !title.trim() || !date}>
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                Duplicate
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
