import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/authz";
import type { SessionUser } from "@/lib/authz";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { UsersTable, type UserRow } from "@/components/admin/users-table";

export default async function AdminUsersPage() {
  const session = await auth();
  const u = session!.user as SessionUser;
  if (!isAdmin(u)) redirect("/dashboard");

  const users = await prisma.user.findMany({
    include: {
      roles: true,
      departmentMemberships: { include: { department: true } },
    },
    orderBy: { displayName: "asc" },
  });

  const rows: UserRow[] = users.map((user) => ({
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    isActive: user.isActive,
    roles: user.roles.map((r) => r.role),
    departments: user.departmentMemberships.map((m) => ({
      name: m.department.name,
      isManager: m.isManager,
    })),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Admin
          </p>
          <h1 className="mt-1 text-display">Users</h1>
          <p className="text-sm text-muted-foreground">
            {users.length} user{users.length === 1 ? "" : "s"}
          </p>
        </div>
        <CreateUserForm />
      </div>

      <UsersTable users={rows} />
    </div>
  );
}
