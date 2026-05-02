"use client";

import { useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput, EventClickArg } from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { QuickCreateEventDialog } from "@/components/events/quick-create-event-dialog";

const STATUS_TOKEN: Record<string, string> = {
  draft: "var(--status-draft)",
  confirmed: "var(--status-confirmed)",
  provisional_function_sheet_sent: "38 92% 50%",
  function_sheet_sent: "var(--status-sent)",
  in_setup: "var(--accent)",
  live: "var(--status-live)",
  closed: "var(--status-closed)",
  archived: "var(--status-closed)",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  confirmed: "Confirmed",
  provisional_function_sheet_sent: "Provisional sent",
  function_sheet_sent: "Sheet sent",
  in_setup: "In setup",
  live: "Live",
  closed: "Closed",
  archived: "Archived",
};

type Coordinator = { id: string; displayName: string };

export function CalendarView({
  events,
  canCreate = false,
  coordinators = [],
}: {
  events: EventInput[];
  canCreate?: boolean;
  coordinators?: Coordinator[];
}) {
  const router = useRouter();
  const calRef = useRef<FullCalendar>(null);
  const [quickCreateDate, setQuickCreateDate] = useState<string | null>(null);

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

  function handleDateClick(arg: DateClickArg) {
    if (!canCreate) return;
    setQuickCreateDate(format(arg.date, "yyyy-MM-dd"));
  }

  return (
    <div className="glass rounded-lg p-4 space-y-4">
      <style>{`
        .fc { --fc-border-color: hsl(var(--border) / 0.4); --fc-page-bg-color: transparent; --fc-neutral-bg-color: transparent; --fc-list-event-hover-bg-color: hsl(var(--surface) / 0.6); --fc-today-bg-color: hsl(var(--primary) / 0.06); --fc-event-border-color: transparent; }
        .fc .fc-toolbar-title { font-size: 1.125rem; font-weight: 600; letter-spacing: -0.01em; }
        .fc .fc-button {
          background: hsl(var(--surface) / 0.55);
          border: 1px solid hsl(var(--border) / 0.6);
          color: hsl(var(--foreground));
          text-transform: capitalize;
          font-weight: 500;
          backdrop-filter: blur(12px) saturate(140%);
          -webkit-backdrop-filter: blur(12px) saturate(140%);
          transition: all 250ms ease-out;
          box-shadow: 0 2px 8px hsl(220 40% 20% / 0.06), inset 0 1px 0 hsl(0 0% 100% / 0.3);
          border-radius: 8px;
        }
        .fc .fc-button:hover {
          background: hsl(var(--surface) / 0.85);
          transform: translateY(-1px);
          box-shadow: 0 4px 16px hsl(220 40% 20% / 0.1), inset 0 1px 0 hsl(0 0% 100% / 0.4);
        }
        .fc .fc-button-primary:not(:disabled).fc-button-active,
        .fc .fc-button-primary:not(:disabled):active {
          background: hsl(var(--primary));
          border-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
          transform: translateY(0);
          box-shadow: 0 2px 12px hsl(var(--primary) / 0.35);
        }
        .fc .fc-col-header-cell-cushion, .fc .fc-daygrid-day-number { color: hsl(var(--muted-foreground)); font-weight: 500; }
        .fc .fc-event {
          cursor: pointer;
          border-radius: 6px;
          font-size: 11px;
          padding: 2px 6px;
          transition: transform 200ms ease-out, box-shadow 200ms ease-out, filter 200ms ease-out;
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          font-weight: 500;
          letter-spacing: 0.01em;
        }
        .fc .fc-event:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px hsl(220 40% 10% / 0.25);
          filter: brightness(1.08);
          z-index: 10;
        }
        .fc .fc-daygrid-day.fc-day-today {
          background: hsl(var(--primary) / 0.05);
          box-shadow: inset 0 0 0 1px hsl(var(--primary) / 0.15);
        }
        ${canCreate ? ".fc .fc-daygrid-day-frame { cursor: pointer; } .fc .fc-daygrid-day-frame:hover { background: hsl(var(--primary) / 0.04); }" : ""}
        .fc-theme-standard td, .fc-theme-standard th { border-color: hsl(var(--border) / 0.4); }
        .fc .fc-popover {
          background: hsl(var(--surface-strong) / 0.88);
          backdrop-filter: blur(20px) saturate(160%);
          -webkit-backdrop-filter: blur(20px) saturate(160%);
          border: 1px solid hsl(var(--border) / 0.6);
          box-shadow: 0 20px 48px hsl(220 60% 2% / 0.25), inset 0 1px 0 hsl(0 0% 100% / 0.1);
          border-radius: 12px;
        }
        .fc .fc-popover-header {
          background: transparent;
          border-bottom: 1px solid hsl(var(--border) / 0.4);
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 600;
          color: hsl(var(--foreground));
        }
        .fc .fc-popover-body { padding: 8px; }
        .fc .fc-more-link {
          color: hsl(var(--primary));
          font-size: 11px;
          font-weight: 600;
          transition: opacity 150ms ease-out;
        }
        .fc .fc-more-link:hover { opacity: 0.7; }
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
        dateClick={canCreate ? handleDateClick : undefined}
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
        {canCreate && (
          <span className="ml-auto text-muted-foreground/60 italic">
            Click any date to create an event
          </span>
        )}
      </div>

      {quickCreateDate && (
        <QuickCreateEventDialog
          date={quickCreateDate}
          coordinators={coordinators}
          onClose={() => setQuickCreateDate(null)}
        />
      )}
    </div>
  );
}
