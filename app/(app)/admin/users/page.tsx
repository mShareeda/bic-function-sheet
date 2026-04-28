import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/authz";
import type { SessionUser } from "@/lib/authz";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateUserForm } from "@/components/admin/create-user-form";

export default async function AdminUsersPage() {
  const session = await auth();
  const u = session!.user as SessionUser;
  if (!isAdmin(u)) redirect("/dashboard");

  const users = await prisma.user.findMany({
    include: { roles: true, departmentMemberships: { include: { department: true } } },
    orderBy: { displayName: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <CreateUserForm />
      </div>
      <div className="grid gap-4">
        {users.map((user) => (
          <Card key={user.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{user.displayName}</CardTitle>
                <span className={`text-xs ${user.isActive ? "text-green-600" : "text-muted-foreground line-through"}`}>
                  {user.isActive ? "Active" : "Deactivated"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {user.roles.map((r) => (
                  <Badge key={r.id} variant="secondary">{r.role}</Badge>
                ))}
                {user.departmentMemberships.map((m) => (
                  <Badge key={m.id} variant="outline">
                    {m.department.name} {m.isManager ? "(manager)" : ""}
                  </Badge>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <a href={`/admin/users/${user.id}`} className="text-sm text-primary underline">
                  Manage
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
