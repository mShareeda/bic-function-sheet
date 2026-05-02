import * as React from "react";
import type { EventStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

type StatusMeta = {
  label: string;
  token: string;
  bg: string;
  text: string;
  ring: string;
  dot: string;
};

const STATUS_META: Record<EventStatus, StatusMeta> = {
  DRAFT: {
    label: "Draft",
    token: "draft",
    bg: "bg-status-draft/10",
    text: "text-status-draft",
    ring: "ring-status-draft/20",
    dot: "bg-status-draft",
  },
  CONFIRMED: {
    label: "Confirmed",
    token: "confirmed",
    bg: "bg-status-confirmed/10",
    text: "text-status-confirmed",
    ring: "ring-status-confirmed/20",
    dot: "bg-status-confirmed",
  },
  PROVISIONAL_FUNCTION_SHEET_SENT: {
    label: "Provisional sent",
    token: "sent",
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    ring: "ring-amber-500/20",
    dot: "bg-amber-500",
  },
  FUNCTION_SHEET_SENT: {
    label: "Sheet sent",
    token: "sent",
    bg: "bg-status-sent/10",
    text: "text-status-sent",
    ring: "ring-status-sent/20",
    dot: "bg-status-sent",
  },
  IN_SETUP: {
    label: "In setup",
    token: "sent",
    bg: "bg-accent/15",
    text: "text-accent-foreground",
    ring: "ring-accent/30",
    dot: "bg-accent",
  },
  LIVE: {
    label: "Live",
    token: "live",
    bg: "bg-status-live/10",
    text: "text-status-live",
    ring: "ring-status-live/20",
    dot: "bg-status-live",
  },
  CLOSED: {
    label: "Closed",
    token: "closed",
    bg: "bg-status-closed/10",
    text: "text-status-closed",
    ring: "ring-status-closed/20",
    dot: "bg-status-closed",
  },
  ARCHIVED: {
    label: "Archived",
    token: "closed",
    bg: "bg-muted/60",
    text: "text-muted-foreground",
    ring: "ring-border",
    dot: "bg-muted-foreground",
  },
};

export function StatusBadge({
  status,
  size = "sm",
  className,
  showDot = true,
}: {
  status: EventStatus;
  size?: "xs" | "sm" | "md";
  className?: string;
  showDot?: boolean;
}) {
  const meta = STATUS_META[status];
  const sizeClass =
    size === "xs"
      ? "text-[10px] px-1.5 py-0.5 gap-1"
      : size === "md"
      ? "text-sm px-2.5 py-1 gap-1.5"
      : "text-xs px-2 py-0.5 gap-1.5";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium ring-1 ring-inset whitespace-nowrap",
        "animate-flip-in",
        meta.bg,
        meta.text,
        meta.ring,
        sizeClass,
        className,
      )}
    >
      {showDot && (
        <span
          aria-hidden
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            meta.dot,
            status === "LIVE" && "animate-pulse",
          )}
        />
      )}
      {meta.label}
    </span>
  );
}

export function getStatusMeta(status: EventStatus) {
  return STATUS_META[status];
}

export const ALL_STATUSES: EventStatus[] = [
  "DRAFT",
  "CONFIRMED",
  "PROVISIONAL_FUNCTION_SHEET_SENT",
  "FUNCTION_SHEET_SENT",
  "IN_SETUP",
  "LIVE",
  "CLOSED",
  "ARCHIVED",
];
