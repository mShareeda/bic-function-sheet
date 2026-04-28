"use client";

import { useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput, EventClickArg } from "@fullcalendar/core";
import { useRouter } from "next/navigation";

const STATUS_TOKEN: Record<string, string> = {
  draft: "var(--status-draft)",
  confirmed: "var(--status-confirmed)",
  function_sheet_sent: "var(--status-sent)",
  in_setup: "var(--accent)",
  live: "var(--status-live)",
  closed: "var(--status-closed)",
  archived: "var(--status-closed)",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  confirmed: "Confirmed",
  function_sheet_sent: "Sheet sent",
  in_setup: "In setup",
  live: "Live",
  closed: "Closed",
  archived: "Archived",
};

export function CalendarView({ events }: { events: EventInput[] }) {
  const router = useRouter();
  const calRef = useRef<FullCalendar>(null);

  const colored = events.map((ev) => {
    const status = (ev.extendedProps?.status as string)?.toLowerCase() ?? "";
    const token = STATUS_TOKEN[status] ?? STATUS_TOKEN.confirmed;
    return {
      ...ev,
      backgroundColor: `hsl(${token} / 0.85)`,
      borderColor: ev.extendedProps?.isVip
        ? "hsl(var(--vip))"
        : `hsl(${token})`,
      borderWidth: ev.extendedProps?.isVip ? 3 : 1,
      textColor: "#fff",
    };
  });

  return (
    <div className="glass rounded-lg p-4 space-y-4">
      <style>{`
        .fc { --fc-border-color: hsl(var(--border) / 0.4); --fc-page-bg-color: transparent; --fc-neutral-bg-color: transparent; --fc-list-event-hover-bg-color: hsl(var(--surface) / 0.6); --fc-today-bg-color: hsl(var(--primary) / 0.06); --fc-event-border-color: transparent; }
        .fc .fc-toolbar-title { font-size: 1.125rem; font-weight: 600; letter-spacing: -0.01em; }
        .fc .fc-button { background: hsl(var(--surface) / 0.5); border: 1px solid hsl(var(--border) / 0.6); color: hsl(var(--foreground)); text-transform: capitalize; font-weight: 500; backdrop-filter: blur(8px); transition: all 200ms; box-shadow: none; }
        .fc .fc-button:hover { background: hsl(var(--surface) / 0.8); }
        .fc .fc-button-primary:not(:disabled).fc-button-active, .fc .fc-button-primary:not(:disabled):active { background: hsl(var(--primary)); border-color: hsl(var(--primary)); color: hsl(var(--primary-foreground)); }
        .fc .fc-col-header-cell-cushion, .fc .fc-daygrid-day-number { color: hsl(var(--muted-foreground)); font-weight: 500; }
        .fc .fc-event { cursor: pointer; border-radius: 6px; font-size: 11px; padding: 1px 4px; transition: transform 150ms ease-out; }
        .fc .fc-event:hover { transform: translateY(-1px); }
        .fc .fc-daygrid-day.fc-day-today { background: hsl(var(--primary) / 0.05); }
        .fc-theme-standard td, .fc-theme-standard th { border-color: hsl(var(--border) / 0.4); }
      `}</style>
      <FullCalendar
        ref={calRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        events={colored}
        height="auto"
        eventClick={(arg: EventClickArg) => {
          if (arg.event.url) {
            arg.jsEvent.preventDefault();
            router.push(arg.event.url);
          }
        }}
        dayMaxEvents={3}
      />
      <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-3 text-xs">
        <span className="text-muted-foreground font-medium uppercase tracking-wide">
          Status
        </span>
        {Object.entries(STATUS_TOKEN).map(([status, token]) => (
          <span
            key={status}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface/60 px-2 py-1"
          >
            <span
              aria-hidden
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: `hsl(${token})` }}
            />
            {STATUS_LABEL[status]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-vip/15 px-2 py-1 ring-1 ring-vip/30">
          <span
            aria-hidden
            className="h-2.5 w-2.5 rounded-sm border-2 border-vip"
          />
          VIP
        </span>
      </div>
    </div>
  );
}
