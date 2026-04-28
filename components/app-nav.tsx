import Link from "next/link";
import type { RoleName } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/server/actions/auth";

type Props = {
  user: { displayName: string; email: string; roles: RoleName[] };
};

export function AppNav({ user }: Props) {
  const isAdmin = user.roles.includes("ADMIN");
  const isCoord = user.roles.includes("COORDINATOR");
  const isMgr = user.roles.includes("DEPT_MANAGER");
  const isMember = user.roles.includes("DEPT_TEAM_MEMBER");

  return (
    <header className="border-b bg-card">
      <div className="container flex h-14 items-center gap-6">
        <Link href="/dashboard" className="font-semibold">
          BIC&apos;s Function Sheet
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="hover:underline">Dashboard</Link>
          <Link href="/calendar" className="hover:underline">Calendar</Link>
          <Link href="/events" className="hover:underline">Events</Link>
          {isMember && !isMgr && !isCoord && !isAdmin && (
            <Link href="/my-tasks" className="hover:underline">My tasks</Link>
          )}
          {(isMgr || isMember) && (isCoord || isAdmin) && (
            <Link href="/my-tasks" className="hover:underline">My tasks</Link>
          )}
          {isAdmin && (
            <>
              <Link href="/admin/users" className="hover:underline">Users</Link>
              <Link href="/admin/departments" className="hover:underline">Departments</Link>
              <Link href="/admin/venues" className="hover:underline">Venues</Link>
              <Link href="/admin/audit" className="hover:underline">Audit</Link>
            </>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link href="/notifications" className="text-sm hover:underline">
            Notifications
          </Link>
          <span className="text-sm text-muted-foreground">{user.displayName}</span>
          <form action={signOutAction}>
            <Button type="submit" variant="outline" size="sm">Sign out</Button>
          </form>
        </div>
      </div>
    </header>
  );
}
