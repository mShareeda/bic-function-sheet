"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { RoleName } from "@prisma/client";
import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";

export function Sidebar({ roles }: { roles: RoleName[] }) {
  const pathname = usePathname();

  const primary = NAV_ITEMS.filter((i) => i.group === "primary" && i.show(roles));
  const admin = NAV_ITEMS.filter((i) => i.group === "admin" && i.show(roles));

  return (
    <aside className="hidden lg:flex sticky top-0 h-dvh w-64 shrink-0 flex-col gap-2 border-r border-border/40 bg-surface/30 backdrop-blur-glass px-4 py-5">
      <Link
        href="/dashboard"
        className="focus-ring flex items-center gap-2.5 rounded-md px-2 py-2 mb-2"
      >
        <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground shadow-sm">
          <Flag className="h-5 w-5" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="font-bold text-sm tracking-tight">BIC</span>
          <span className="text-[11px] text-muted-foreground">Function Sheet</span>
        </span>
      </Link>

      <NavGroup items={primary} pathname={pathname} />
      {admin.length > 0 && (
        <>
          <div className="mt-4 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Admin
          </div>
          <NavGroup items={admin} pathname={pathname} />
        </>
      )}
    </aside>
  );
}

function NavGroup({
  items,
  pathname,
}: {
  items: typeof NAV_ITEMS;
  pathname: string;
}) {
  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "focus-ring group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-surface/70 hover:text-foreground",
            )}
          >
            {active && (
              <span className="absolute left-0 top-2 h-[calc(100%-1rem)] w-[3px] rounded-r-full bg-primary" />
            )}
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
