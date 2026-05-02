import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/authz";
import type { SessionUser } from "@/lib/authz";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserRolesForm } from "@/components/admin/user-roles-form";
import { UserDeptForm } from "@/components/admin/user-dept-form";
import { ToggleUserActiveButton } from "@/components/admin/toggle-user-active";
import { ResetPasswordForm } from "@/components/admin/reset-password-form";
import { DeleteUserButton } from "@/components/admin/delete-user-button";

export default async function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const session = await auth();
  const u = session!.user as SessionUser;
  if (!isAdmin(u)) redirect("/dashboard");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: true,
      departmentMemberships: { include: { department: true } },
    },
  });
  if (!user) notFound();

  const allDepts = await prisma.department.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const isSelf = u.id === userId;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{user.displayName}</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          {user.mustChangePassword && (
            <p className="text-xs text-amber-600 mt-1">⚠ Must change password on next login</p>
          )}
        </div>
        <ToggleUserActiveButton userId={userId} userName={user.displayName} isActive={user.isActive} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Roles</CardTitle></CardHeader>
        <CardContent>
          <UserRolesForm userId={userId} currentRoles={user.roles.map((r) => r.role)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Department memberships</CardTitle></CardHeader>
        <CardContent>
          <UserDeptForm
            userId={userId}
            allDepts={allDepts}
            currentMemberships={user.departmentMemberships}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Reset password</CardTitle></CardHeader>
        <CardContent>
          <ResetPasswordForm userId={userId} />
        </CardContent>
      </Card>

      {!isSelf && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Permanently deletes the user account. Blocked if the user has created events or uploaded files — deactivate instead.
            </p>
            <DeleteUserButton userId={userId} userName={user.displayName} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
