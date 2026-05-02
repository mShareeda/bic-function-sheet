"use client";

import * as React from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  url: string | null;
  type: string;
  createdAt: string;
};

type SSEPayload = {
  unreadCount: number;
  notifications: NotificationItem[];
};

const RETRY_DELAY_MS = 5_000;

export function NotificationBell() {
  const [payload, setPayload] = React.useState<SSEPayload>({
    unreadCount: 0,
    notifications: [],
  });
  const [open, setOpen] = React.useState(false);
  const [connected, setConnected] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const esRef = React.useRef<EventSource | null>(null);
  const retryRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // SSE connection with auto-reconnect
  React.useEffect(() => {
    let cancelled = false;

    function connect() {
      if (cancelled) return;
      const es = new EventSource("/api/notifications/stream");
      esRef.current = es;

      es.onopen = () => setConnected(true);

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data as string) as SSEPayload;
          setPayload(data);
        } catch {
          // ignore malformed frames
        }
      };

      es.onerror = () => {
        setConnected(false);
        es.close();
        esRef.current = null;
        if (!cancelled) {
          retryRef.current = setTimeout(connect, RETRY_DELAY_MS);
        }
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (retryRef.current) clearTimeout(retryRef.current);
      esRef.current?.close();
      esRef.current = null;
    };
  }, []);

  // Close panel on outside click
  React.useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  // Close panel on Escape
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const badgeCount = payload.unreadCount;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={
          badgeCount > 0
            ? `${badgeCount} unread notification${badgeCount !== 1 ? "s" : ""}`
            : "Notifications"
        }
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          "focus-ring relative flex h-9 w-9 items-center justify-center rounded-full transition-colors",
          open ? "bg-surface/80" : "hover:bg-surface/60",
        )}
      >
        <Bell
          className={cn(
            "h-[18px] w-[18px] transition-colors",
            badgeCount > 0 ? "text-foreground" : "text-muted-foreground",
          )}
        />
        {badgeCount > 0 && (
          <span
            aria-hidden
            className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold leading-none text-primary-foreground animate-fade-in"
          >
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
        {!connected && (
          <span
            aria-hidden
            title="Reconnecting…"
            className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-muted-foreground/40"
          />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications panel"
          className="glass-strong absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-md shadow-xl animate-fade-in-up"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
            <span className="text-sm font-semibold">Notifications</span>
            {badgeCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {badgeCount} unread
              </span>
            )}
          </div>

          {/* Notification list */}
          {payload.notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Bell className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">All caught up!</p>
            </div>
          ) : (
            <ul className="max-h-[22rem] divide-y divide-border/40 overflow-y-auto">
              {payload.notifications.map((n) => (
                <li
                  key={n.id}
                  className="group px-4 py-3 transition-colors hover:bg-surface/50"
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {n.body}
                      </p>
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-muted-foreground/70">
                          {formatDistanceToNow(new Date(n.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                        {n.url && (
                          <Link
                            href={n.url}
                            onClick={() => setOpen(false)}
                            className="text-[11px] font-medium text-primary hover:underline"
                          >
                            View →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Footer link */}
          <div className="border-t border-border/40 px-4 py-2.5">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-primary hover:underline"
            >
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
