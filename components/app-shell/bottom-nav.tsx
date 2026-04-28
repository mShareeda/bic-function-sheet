"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { RoleName } from "@prisma/client";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, BOTTOM_NAV_HREFS } from "./nav-items";

export function BottomNav({ roles }: { roles: RoleName[] }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter(
    (i) => BOTTOM_NAV_HREFS.includes(i.href) && i.show(roles),
  ).slice(0, 5);

  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Primary"
      className="glass-strong fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-border/40 px-2 pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "focus-ring relative flex flex-1 flex-col items-center justify-center gap-1 rounded-md py-2 text-[11px] font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5 transition-transform",
                active && "scale-110",
              )}
            />
            <span>{item.label}</span>
            {active && (
              <span className="absolute bottom-0 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-t-full bg-primary" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
