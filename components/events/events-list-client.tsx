"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import type { EventStatus } from "@prisma/client";
import { Search, ListFilter, CalendarX, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge, ALL_STATUSES } from "@/components/ui/status-badge";
import { VipBadge } from "@/components/ui/vip-badge";
import { cn } from "@/lib/utils";
import { deleteEventAction } from "@/server/actions/events";

export type EventListItem = {
  id: string;
  title: string;
  eventDate: string;
  status: EventStatus;
  isVip: boolean;
  coordinator?: string | null;
  maximizerNumber?: string | null;
  estimatedGuests?: number | null;
};

export function EventsListClient({
  events,
  initialStatus,
  isAdmin,
}: {
  events: EventListItem[];
  initialStatus?: string;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [activeStatuses, setActiveStatuses] = React.useState<Set<EventStatus>>(
    () => {
      const s = initialStatus as EventStatus | undefined;
      return s && ALL_STATUSES.includes(s) ? new Set([s]) : new Set();
    },
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      if (activeStatuses.size > 0 && !activeStatuses.has(e.status)) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.coordinator?.toLowerCase().includes(q) ||
        e.maximizerNumber?.toLowerCase().includes(q)
      );
    });
  }, [events, query, activeStatuses]);

  const toggleStatus = (s: EventStatus) => {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const clearFilters = () => {
    setQuery("");
    setActiveStatuses(new Set());
  };

  const filtersActive = query !== "" || activeStatuses.size > 0;

  async function handleDelete(e: React.MouseEvent, eventId: string, title: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeletingId(eventId);
    const result = await deleteEventAction(eventId);
    if (result.ok) {
      router.refresh();
    } else {
      alert(result.error);
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="glass flex flex-col gap-3 rounded-md p-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, coordinator, Maximizer #..."
            className="bg-transparent border-transparent pl-9 focus-visible:bg-surface/40"
            aria-label="Search events"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <ListFilter className="h-3.5 w-3.5 text-muted-foreground" />
          {ALL_STATUSES.filter((s) => s !== "ARCHIVED").map((s) => {
            const active = activeStatuses.has(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleStatus(s)}
                aria-pressed={active}
                className={cn(
                  "focus-ring rounded-full transition-all",
                  active ? "ring-2 ring-primary/30 scale-105" : "opacity-70 hover:opacity-100",
                )}
              >
                <StatusBadge status={s} size="xs" showDot={false} />
              </button>
            );
          })}
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
              Clear
            </Button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing <span className="font-semibold tabular-nums">{filtered.length}</span> of{" "}
        <span className="tabular-nums">{events.length}</span> events
      </p>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-muted/50 text-muted-foreground">
              <CalendarX className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium">No events match</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              {filtersActive
                ? "Try clearing filters or refining your search."
                : "Events you create or get assigned to will appear here."}
            </p>
            {filtersActive && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="mt-2">
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((ev, i) => (
            <div
              key={ev.id}
              className="relative animate-fade-in-up"
              style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
            >
              <Link
                href={`/events/${ev.id}`}
                className={cn("focus-ring block rounded-lg", deletingId === ev.id && "pointer-events-none opacity-50")}
              >
                <Card
                  className={cn(
                    "group cursor-pointer transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-glass-lg",
                    ev.isVip
                      ? "vip-shimmer border-l-4 border-l-vip ring-1 ring-vip/25 hover:ring-vip/40"
                      : "",
                  )}
                >
                  <CardContent className="flex flex-wrap items-center gap-4 py-4">
                    <DateBlock date={new Date(ev.eventDate)} isVip={ev.isVip} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-base font-semibold">{ev.title}</span>
                        {ev.isVip && <VipBadge size="xs" />}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(ev.eventDate), "EEE d MMM yyyy")}
                        {ev.coordinator && ` · ${ev.coordinator}`}
                        {ev.maximizerNumber && ` · #${ev.maximizerNumber}`}
                        {ev.estimatedGuests ? ` · ${ev.estimatedGuests} guests` : ""}
                      </p>
                    </div>
                    <StatusBadge status={ev.status} />
                    {isAdmin && <div className="w-8" />}
                  </CardContent>
                </Card>
              </Link>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 z-10"
                  disabled={deletingId === ev.id}
                  onClick={(e) => handleDelete(e, ev.id, ev.title)}
                  aria-label={`Delete ${ev.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DateBlock({ date, isVip }: { date: Date; isVip?: boolean }) {
  return (
    <div
      className={cn(
        "grid h-14 w-14 shrink-0 place-items-center rounded-md ring-1",
        isVip
          ? "bg-vip/15 text-vip-foreground ring-vip/40"
          : "bg-primary/10 text-primary ring-primary/20",
      )}
    >
      <p className="text-[10px] font-medium uppercase leading-none">
        {format(date, "MMM")}
      </p>
      <p className="text-xl font-bold leading-none tabular-nums">
        {format(date, "d")}
      </p>
    </div>
  );
}
