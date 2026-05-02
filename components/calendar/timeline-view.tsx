"use client";

// ── Gantt / Timeline View ──────────────────────────────────────────────────
// Pure CSS approach — no new libraries.
// Renders three phase bars (setup, live, breakdown) per event inside a
// horizontally-navigable time window. VIP events get a gold shimmer border.
// Hover shows a glassmorphic tooltip with phase details.

import { useState, useRef } from "react";
import Link from "next/link";
import { addDays, format, differenceInMinutes, startOfDay, isToday } from "date-fns";

// ── Types ───────────────────────────────────────────────────────────────────

export interface TimelineEvent {
  id: string;
  title: string;
  status: string;
  isVip: boolean;
  setupStart: string;
  setupEnd: string;
  liveStart: string;
  liveEnd: string;
  breakdownStart: string;
  breakdownEnd: string;
  coordinator?: string;
  url: string;
}

// ── Constants ───────────────────────────────────────────────────────────────

// Raw HSL channel values — same pattern as calendar-view.tsx
const STATUS_TOKEN: Record<string, string> = {
  DRAFT: "var(--status-draft)",
  CONFIRMED: "var(--status-confirmed)",
  PROVISIONAL_FUNCTION_SHEET_SENT: "38 92% 50%",
  FUNCTION_SHEET_SENT: "var(--status-sent)",
  IN_SETUP: "var(--accent)",
  LIVE: "var(--status-live)",
  CLOSED: "var(--status-closed)",
  ARCHIVED: "var(--status-closed)",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  PROVISIONAL_FUNCTION_SHEET_SENT: "Provisional sent",
  FUNCTION_SHEET_SENT: "Sheet sent",
  IN_SETUP: "In setup",
  LIVE: "Live",
  CLOSED: "Closed",
  ARCHIVED: "Archived",
};

const SCALES = [7, 14, 30] as const;
type Scale = (typeof SCALES)[number];

const ROW_H = 48;
const HEADER_H = 54;
const LABEL_W = 188;

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Returns left% and width% of [start,end] clipped to [winStart,winEnd]. */
function bar(
  start: Date,
  end: Date,
  winStart: Date,
  winEnd: Date,
): { left: number; width: number } {
  const total = differenceInMinutes(winEnd, winStart);
  if (total <= 0) return { left: 0, width: 0 };
  const clampedStart = start < winStart ? winStart : start;
  const clampedEnd = end > winEnd ? winEnd : end;
  if (clampedEnd <= clampedStart) return { left: 0, width: 0 };
  const left = (differenceInMinutes(clampedStart, winStart) / total) * 100;
  const width = (differenceInMinutes(clampedEnd, clampedStart) / total) * 100;
  return { left, width };
}

// ── Component ────────────────────────────────────────────────────────────────

interface TooltipState {
  ev: TimelineEvent;
  x: number;
  y: number;
}

export function TimelineView({ events }: { events: TimelineEvent[] }) {
  // Initialise view window to the earliest setupStart (or today).
  const [viewStart, setViewStart] = useState<Date>(() => {
    if (events.length === 0) return startOfDay(new Date());
    const earliest = events.reduce<Date>((min, e) => {
      const d = new Date(e.setupStart);
      return d < min ? d : min;
    }, new Date(events[0].setupStart));
    // Don't start before today if earliest is in the future
    const today = startOfDay(new Date());
    return earliest < today ? earliest : today;
  });

  const [scale, setScale] = useState<Scale>(14);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const viewEnd = addDays(viewStart, scale);
  const days = Array.from({ length: scale }, (_, i) => addDays(viewStart, i));

  // Filter to events that overlap the current window
  const visible = events
    .filter((e) => new Date(e.setupStart) < viewEnd && new Date(e.breakdownEnd) > viewStart)
    .sort((a, b) => new Date(a.setupStart).getTime() - new Date(b.setupStart).getTime());

  function navigate(dir: -1 | 1) {
    setViewStart((prev) => addDays(prev, dir * Math.floor(scale / 2)));
  }

  function goToday() {
    setViewStart(startOfDay(new Date()));
  }

  function onMouseMove(e: React.MouseEvent) {
    if (tooltip) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect)
        setTooltip((prev) =>
          prev ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top } : null,
        );
    }
  }

  function showTooltip(ev: TimelineEvent, e: React.MouseEvent) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect)
      setTooltip({ ev, x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  const totalH = HEADER_H + ROW_H * Math.max(1, visible.length);

  return (
    <>
      {/* Scoped styles */}
      <style>{`
        .tl-btn {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 2rem; height: 2rem; padding: 0 0.5rem;
          border-radius: 7px; font-size: 0.75rem; font-weight: 500;
          background: hsl(var(--surface) / 0.55);
          border: 1px solid hsl(var(--border) / 0.5);
          color: hsl(var(--foreground));
          cursor: pointer; transition: all 200ms ease-out;
          backdrop-filter: blur(12px);
        }
        .tl-btn:hover { background: hsl(var(--surface) / 0.9); transform: translateY(-1px); }
        .tl-btn.active {
          background: hsl(var(--primary));
          border-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
        .tl-vip-bar {
          box-shadow: 0 0 0 2px hsl(var(--vip)), 0 4px 16px hsl(var(--vip) / 0.45) !important;
        }
        .tl-vip-shimmer {
          background: linear-gradient(
            105deg,
            transparent 25%,
            hsl(var(--vip) / 0.35) 50%,
            transparent 75%
          );
          background-size: 200% 100%;
          animation: shimmer 2.5s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .tl-vip-shimmer { animation: none; }
          .tl-btn:hover { transform: none; }
        }
      `}</style>

      <div className="glass rounded-lg overflow-hidden flex flex-col">
        {/* ── Toolbar ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/40">
          {/* Navigation */}
          <div className="flex items-center gap-1.5">
            <button className="tl-btn" onClick={() => navigate(-1)} aria-label="Previous period">
              ←
            </button>
            <button className="tl-btn" onClick={goToday}>
              Today
            </button>
            <button className="tl-btn" onClick={() => navigate(1)} aria-label="Next period">
              →
            </button>
            <span className="ml-2 text-sm font-semibold tabular-nums">
              {format(viewStart, "MMM d")}
              {" – "}
              {format(addDays(viewEnd, -1), "MMM d, yyyy")}
            </span>
          </div>

          {/* Scale */}
          <div className="flex items-center gap-1">
            {SCALES.map((s) => (
              <button
                key={s}
                className={`tl-btn${scale === s ? " active" : ""}`}
                onClick={() => setScale(s)}
                aria-pressed={scale === s}
              >
                {s}d
              </button>
            ))}
          </div>
        </div>

        {/* ── Grid ────────────────────────────────────────────────────── */}
        <div
          ref={containerRef}
          className="relative"
          style={{ minHeight: totalH }}
          onMouseMove={onMouseMove}
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Sticky header */}
          <div
            className="sticky top-0 z-10 flex"
            style={{
              height: HEADER_H,
              background: "hsl(var(--surface-strong) / 0.82)",
              backdropFilter: "blur(16px) saturate(150%)",
              WebkitBackdropFilter: "blur(16px) saturate(150%)",
              borderBottom: "1px solid hsl(var(--border) / 0.4)",
            }}
          >
            {/* Corner cell */}
            <div
              style={{ width: LABEL_W, minWidth: LABEL_W, flexShrink: 0 }}
              className="border-r border-border/40 flex items-end pb-2 px-3"
            >
              <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                Event
              </span>
            </div>

            {/* Day headers */}
            <div className="flex flex-1">
              {days.map((day) => {
                const todayFlag = isToday(day);
                return (
                  <div
                    key={day.toISOString()}
                    className="flex-1 flex flex-col items-center justify-end pb-2 border-r border-border/20"
                    style={{
                      background: todayFlag ? "hsl(var(--primary) / 0.07)" : undefined,
                    }}
                  >
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {format(day, "EEE")}
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        todayFlag ? "text-primary" : "text-foreground/80"
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                    {todayFlag && (
                      <span className="w-1 h-1 rounded-full bg-primary mt-0.5" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Empty state */}
          {visible.length === 0 && (
            <div
              className="flex items-center justify-center text-sm text-muted-foreground"
              style={{ height: ROW_H * 3 }}
            >
              No events overlap this period
            </div>
          )}

          {/* Event rows */}
          {visible.map((ev, rowIdx) => {
            const setupS = new Date(ev.setupStart);
            const setupE = new Date(ev.setupEnd);
            const liveS = new Date(ev.liveStart);
            const liveE = new Date(ev.liveEnd);
            const bkdnS = new Date(ev.breakdownStart);
            const bkdnE = new Date(ev.breakdownEnd);

            const setup = bar(setupS, setupE, viewStart, viewEnd);
            const live = bar(liveS, liveE, viewStart, viewEnd);
            const bkdn = bar(bkdnS, bkdnE, viewStart, viewEnd);

            const token = STATUS_TOKEN[ev.status] ?? STATUS_TOKEN.CONFIRMED;
            const isAltRow = rowIdx % 2 === 1;

            return (
              <div
                key={ev.id}
                className="flex"
                style={{
                  height: ROW_H,
                  borderBottom: "1px solid hsl(var(--border) / 0.2)",
                }}
              >
                {/* Label */}
                <div
                  style={{ width: LABEL_W, minWidth: LABEL_W, flexShrink: 0 }}
                  className="border-r border-border/40 px-3 flex items-center gap-1.5 overflow-hidden"
                >
                  {ev.isVip && (
                    <span className="flex-shrink-0 text-vip text-xs leading-none">★</span>
                  )}
                  <Link
                    href={ev.url}
                    className="text-xs font-medium truncate hover:text-primary transition-colors"
                    title={ev.title}
                  >
                    {ev.title}
                  </Link>
                </div>

                {/* Bars */}
                <div
                  className="flex-1 relative"
                  style={{
                    background: isAltRow ? "hsl(var(--surface) / 0.18)" : undefined,
                  }}
                >
                  {/* Grid lines + today highlight */}
                  {days.map((day, di) => (
                    <div
                      key={di}
                      className="absolute inset-y-0 border-r border-border/10"
                      style={{
                        left: `${(di / scale) * 100}%`,
                        width: `${(1 / scale) * 100}%`,
                        background: isToday(day)
                          ? "hsl(var(--primary) / 0.04)"
                          : undefined,
                      }}
                    />
                  ))}

                  {/* Setup bar */}
                  {setup.width > 0.1 && (
                    <div
                      className="absolute rounded-l"
                      style={{
                        left: `${setup.left}%`,
                        width: `${setup.width}%`,
                        top: "35%",
                        height: "30%",
                        background: "hsl(var(--muted-foreground) / 0.28)",
                        borderRight: "1px dashed hsl(var(--border) / 0.5)",
                      }}
                      title={`Setup: ${format(setupS, "MMM d HH:mm")} – ${format(setupE, "HH:mm")}`}
                    />
                  )}

                  {/* Live bar (primary colored, taller) */}
                  {live.width > 0.1 && (
                    <div
                      className={`absolute cursor-pointer overflow-hidden${ev.isVip ? " tl-vip-bar" : ""}`}
                      style={{
                        left: `${live.left}%`,
                        width: `${live.width}%`,
                        top: "16%",
                        height: "68%",
                        background: `hsl(${token} / 0.82)`,
                        borderRadius: 5,
                        boxShadow: !ev.isVip
                          ? `0 2px 10px hsl(${token} / 0.28)`
                          : undefined,
                        backdropFilter: "blur(4px)",
                        willChange: "transform",
                        transition: "filter 200ms ease-out, transform 200ms ease-out",
                      }}
                      onMouseEnter={(e) => showTooltip(ev, e)}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      {/* VIP shimmer overlay */}
                      {ev.isVip && (
                        <div className="tl-vip-shimmer absolute inset-0 pointer-events-none" />
                      )}
                      {/* Title inside bar */}
                      <span
                        className="absolute inset-0 flex items-center px-2 text-[10px] font-semibold text-white truncate pointer-events-none"
                        style={{ textShadow: "0 1px 3px rgba(0,0,0,0.45)" }}
                      >
                        {ev.title}
                      </span>
                    </div>
                  )}

                  {/* Breakdown bar */}
                  {bkdn.width > 0.1 && (
                    <div
                      className="absolute rounded-r"
                      style={{
                        left: `${bkdn.left}%`,
                        width: `${bkdn.width}%`,
                        top: "35%",
                        height: "30%",
                        background: "hsl(var(--muted-foreground) / 0.18)",
                        borderLeft: "1px dashed hsl(var(--border) / 0.5)",
                      }}
                      title={`Breakdown: ${format(bkdnS, "MMM d HH:mm")} – ${format(bkdnE, "HH:mm")}`}
                    />
                  )}
                </div>
              </div>
            );
          })}

          {/* Glassmorphic tooltip */}
          {tooltip && (
            <div
              className="absolute z-30 pointer-events-none select-none animate-fade-in"
              style={{
                left: Math.min(
                  tooltip.x + 14,
                  (containerRef.current?.offsetWidth ?? 600) - LABEL_W - 260,
                ),
                top: Math.max(
                  tooltip.y - 100,
                  HEADER_H + 4,
                ),
                width: 252,
              }}
            >
              <div
                style={{
                  background: "hsl(var(--surface-strong) / 0.92)",
                  backdropFilter: "blur(20px) saturate(160%)",
                  WebkitBackdropFilter: "blur(20px) saturate(160%)",
                  border: "1px solid hsl(var(--border) / 0.55)",
                  borderRadius: 12,
                  boxShadow:
                    "0 20px 48px hsl(220 60% 2% / 0.28), inset 0 1px 0 hsl(0 0% 100% / 0.1)",
                  padding: "12px 14px",
                }}
              >
                {/* Title row */}
                <div className="flex items-start gap-1.5 mb-2.5">
                  {tooltip.ev.isVip && (
                    <span className="text-vip text-sm mt-px flex-shrink-0">★</span>
                  )}
                  <p className="text-sm font-semibold leading-snug">{tooltip.ev.title}</p>
                </div>

                {/* Status pill */}
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                    style={{
                      background: `hsl(${STATUS_TOKEN[tooltip.ev.status] ?? STATUS_TOKEN.CONFIRMED})`,
                    }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {STATUS_LABEL[tooltip.ev.status] ?? tooltip.ev.status}
                  </span>
                </div>

                {/* Phase grid */}
                <div className="space-y-1.5 text-[11px] text-muted-foreground border-t border-border/40 pt-2">
                  <PhaseRow
                    label="Setup"
                    start={tooltip.ev.setupStart}
                    end={tooltip.ev.setupEnd}
                    color="hsl(var(--muted-foreground) / 0.5)"
                  />
                  <PhaseRow
                    label="Live"
                    start={tooltip.ev.liveStart}
                    end={tooltip.ev.liveEnd}
                    color={`hsl(${STATUS_TOKEN[tooltip.ev.status] ?? STATUS_TOKEN.CONFIRMED})`}
                  />
                  <PhaseRow
                    label="Breakdown"
                    start={tooltip.ev.breakdownStart}
                    end={tooltip.ev.breakdownEnd}
                    color="hsl(var(--muted-foreground) / 0.35)"
                  />
                </div>

                {/* Coordinator */}
                {tooltip.ev.coordinator && (
                  <p className="mt-2 pt-2 border-t border-border/30 text-[11px] text-muted-foreground">
                    Coordinator: <span className="text-foreground/80">{tooltip.ev.coordinator}</span>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Legend ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-4 px-4 py-3 border-t border-border/40 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-5 rounded-sm bg-muted-foreground/30" />
            <span>Setup / Breakdown</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3.5 w-8 rounded-sm" style={{ background: "hsl(var(--status-live) / 0.8)" }} />
            <span>Live period (colored by status)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="h-3.5 w-8 rounded-sm overflow-hidden relative"
              style={{ boxShadow: "0 0 0 2px hsl(var(--vip))", background: "hsl(var(--status-confirmed) / 0.8)" }}
            >
              <div className="tl-vip-shimmer absolute inset-0" />
            </div>
            <span className="text-vip font-medium">VIP event</span>
          </div>
        </div>
      </div>
    </>
  );
}

// ── PhaseRow helper ──────────────────────────────────────────────────────────

function PhaseRow({
  label,
  start,
  end,
  color,
}: {
  label: string;
  start: string;
  end: string;
  color: string;
}) {
  const s = new Date(start);
  const e = new Date(end);
  const sameDay =
    s.getFullYear() === e.getFullYear() &&
    s.getMonth() === e.getMonth() &&
    s.getDate() === e.getDate();

  return (
    <div className="flex items-start gap-1.5">
      <span
        className="inline-block h-2 w-2 rounded-sm flex-shrink-0 mt-0.5"
        style={{ background: color }}
      />
      <span className="font-medium w-16 flex-shrink-0">{label}</span>
      <span>
        {format(s, "MMM d, HH:mm")}
        {" – "}
        {sameDay ? format(e, "HH:mm") : format(e, "MMM d, HH:mm")}
      </span>
    </div>
  );
}
