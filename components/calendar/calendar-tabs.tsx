"use client";

// ── CalendarTabs ─────────────────────────────────────────────────────────────
// Client wrapper that toggles between the FullCalendar month view and the
// new Gantt / Timeline view. Holds the active-tab state so the server page
// stays a pure React Server Component.

import { useState } from "react";
import type { EventInput } from "@fullcalendar/core";
import { CalendarView } from "./calendar-view";
import { TimelineView, type TimelineEvent } from "./timeline-view";

type Tab = "calendar" | "timeline";

interface CalendarTabsProps {
  calEvents: EventInput[];
  timelineEvents: TimelineEvent[];
}

export function CalendarTabs({ calEvents, timelineEvents }: CalendarTabsProps) {
  const [tab, setTab] = useState<Tab>("calendar");

  return (
    <div className="space-y-3">
      {/* Tab bar */}
      <div
        className="inline-flex items-center gap-1 p-1 rounded-lg"
        style={{
          background: "hsl(var(--surface) / 0.55)",
          backdropFilter: "blur(12px)",
          border: "1px solid hsl(var(--border) / 0.4)",
        }}
        role="tablist"
        aria-label="Calendar view"
      >
        <TabButton
          active={tab === "calendar"}
          onClick={() => setTab("calendar")}
          icon={
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
              <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
              <path d="M1 7h14" stroke="currentColor" strokeWidth="1.4" />
              <path d="M5 1v4M11 1v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          }
          label="Calendar"
        />
        <TabButton
          active={tab === "timeline"}
          onClick={() => setTab("timeline")}
          icon={
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
              <rect x="1" y="4" width="7" height="2.5" rx="1.25" fill="currentColor" opacity=".6" />
              <rect x="1" y="8" width="11" height="2.5" rx="1.25" fill="currentColor" />
              <rect x="1" y="12" width="5" height="2.5" rx="1.25" fill="currentColor" opacity=".6" />
            </svg>
          }
          label="Timeline"
        />
      </div>

      {/* Views */}
      {tab === "calendar" ? (
        <CalendarView events={calEvents} />
      ) : (
        <TimelineView events={timelineEvents} />
      )}
    </div>
  );
}

// ── TabButton ────────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.375rem",
        padding: "0.3rem 0.75rem",
        borderRadius: "7px",
        fontSize: "0.8125rem",
        fontWeight: 500,
        cursor: "pointer",
        border: "none",
        transition: "background 200ms ease-out, color 200ms ease-out, box-shadow 200ms ease-out",
        background: active ? "hsl(var(--primary))" : "transparent",
        color: active ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
        boxShadow: active ? "0 2px 12px hsl(var(--primary) / 0.3)" : "none",
      }}
    >
      {icon}
      {label}
    </button>
  );
}
