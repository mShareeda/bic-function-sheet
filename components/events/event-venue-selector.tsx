"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { addEventVenueAction, removeEventVenueAction } from "@/server/actions/requirements";

type Venue = { id: string; name: string };

export function EventVenueSelector({
  eventId,
  allVenues,
  initialVenueIds,
}: {
  eventId: string;
  allVenues: Venue[];
  initialVenueIds: string[];
}) {
  const [activeIds, setActiveIds] = useState<string[]>(initialVenueIds);
  const [pending, startTransition] = useTransition();

  function toggle(venueId: string) {
    startTransition(async () => {
      if (activeIds.includes(venueId)) {
        await removeEventVenueAction(eventId, venueId);
        setActiveIds((prev) => prev.filter((id) => id !== venueId));
      } else {
        await addEventVenueAction(eventId, venueId);
        setActiveIds((prev) => [...prev, venueId]);
      }
    });
  }

  if (allVenues.length === 0) {
    return <p className="text-sm text-muted-foreground">No venues configured. Add venues in Admin → Venues.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Select all venues required for this event.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {allVenues.map((v) => {
          const active = activeIds.includes(v.id);
          return (
            <button
              key={v.id}
              type="button"
              disabled={pending}
              onClick={() => toggle(v.id)}
              className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm text-left transition-colors ${
                active
                  ? "border-primary bg-primary/5 text-primary font-medium"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <span>{v.name}</span>
              {active && <Badge variant="default" className="text-xs">Selected</Badge>}
            </button>
          );
        })}
      </div>
      {activeIds.length > 0 && (
        <p className="text-xs text-muted-foreground">{activeIds.length} venue(s) selected.</p>
      )}
    </div>
  );
}
