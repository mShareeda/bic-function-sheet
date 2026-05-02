"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { format } from "date-fns";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  CheckSquare,
  Bell,
  Users,
  Building2,
  MapPin,
  ScrollText,
  Repeat2,
  Plus,
  CalendarRange,
} from "lucide-react";
import type { RoleName } from "@prisma/client";
import { NAV_ITEMS } from "./nav-items";

type RecentEvent = {
  id: string;
  title: string;
  eventDate: string; // ISO string
  status: string;
};

const ICON_MAP: Record<string, React.ElementType> = {
  "/dashboard": LayoutDashboard,
  "/events": ClipboardList,
  "/calendar": CalendarDays,
  "/recurring": Repeat2,
  "/my-tasks": CheckSquare,
  "/notifications": Bell,
  "/admin/users": Users,
  "/admin/departments": Building2,
  "/admin/venues": MapPin,
  "/admin/audit": ScrollText,
};

export function CommandPalette({
  roles,
  recentEvents,
  canCreate,
}: {
  roles: RoleName[];
  recentEvents: RecentEvent[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const navItems = NAV_ITEMS.filter((i) => i.show(roles));

  const toggle = useCallback(() => setOpen((o) => !o), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggle();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggle]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] bg-black/40 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="w-full max-w-lg mx-4 rounded-xl border border-border/60 bg-card shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95">
        <Command className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground">
          <div className="flex items-center border-b border-border/40 px-3">
            <svg
              className="mr-2 h-4 w-4 shrink-0 text-muted-foreground"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <Command.Input
              autoFocus
              placeholder="Search navigation, events…"
              className="flex-1 h-12 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              Esc
            </kbd>
          </div>

          <Command.List className="max-h-[360px] overflow-y-auto p-1">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            {canCreate && (
              <Command.Group heading="Actions">
                <CommandItem
                  icon={<Plus className="h-4 w-4" />}
                  label="New event"
                  onSelect={() => go("/events/new")}
                />
              </Command.Group>
            )}

            {recentEvents.length > 0 && (
              <Command.Group heading="Recent events">
                {recentEvents.map((ev) => (
                  <CommandItem
                    key={ev.id}
                    icon={<CalendarRange className="h-4 w-4" />}
                    label={ev.title}
                    hint={format(new Date(ev.eventDate), "d MMM yyyy")}
                    onSelect={() => go(`/events/${ev.id}`)}
                  />
                ))}
              </Command.Group>
            )}

            <Command.Group heading="Navigate">
              {navItems.map((item) => {
                const Icon = ICON_MAP[item.href] ?? LayoutDashboard;
                return (
                  <CommandItem
                    key={item.href}
                    icon={<Icon className="h-4 w-4" />}
                    label={item.label}
                    onSelect={() => go(item.href)}
                  />
                );
              })}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

function CommandItem({
  icon,
  label,
  hint,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer select-none
        text-foreground
        data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary
        hover:bg-surface/60 transition-colors"
    >
      <span className="text-muted-foreground data-[selected=true]:text-primary">{icon}</span>
      <span className="flex-1">{label}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </Command.Item>
  );
}
