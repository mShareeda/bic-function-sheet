"use client";

import { useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput, EventClickArg } from "@fullcalendar/core";
import { useRouter } from "next/navigation";

const STATUS_COLORS: Record<string, string> = {
  draft: "#94a3b8",
  confirmed: "#3b82f6",
  function_sheet_sent: "#6366f1",
  in_setup: "#f59e0b",
  live: "#22c55e",
  closed: "#6b7280",
  archived: "#d1d5db",
};

export function CalendarView({ events }: { events: EventInput[] }) {
  const router = useRouter();
  const calRef = useRef<FullCalendar>(null);

  const colored = events.map((ev) => {
    const status = (ev.extendedProps?.status as string)?.toLowerCase() ?? "";
    return {
      ...ev,
      backgroundColor: STATUS_COLORS[status] ?? "#3b82f6",
      borderColor: ev.extendedProps?.isVip ? "#991b1b" : (STATUS_COLORS[status] ?? "#3b82f6"),
      borderWidth: ev.extendedProps?.isVip ? 3 : 1,
      textColor: "#fff",
    };
  });

  return (
    <div className="rounded-lg border bg-card p-4">
      <style>{`
        .fc-event { cursor: pointer; border-radius: 4px; font-size: 12px; }
        .fc-toolbar-title { font-size: 1rem; font-weight: 600; }
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
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <span key={status} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: color }} />
            {status.replace(/_/g, " ")}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm inline-block border-2 border-red-800" style={{ backgroundColor: STATUS_COLORS.confirmed }} />
          VIP (thick border)
        </span>
      </div>
    </div>
  );
}
