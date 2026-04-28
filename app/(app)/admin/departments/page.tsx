import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/authz";
import type { SessionUser } from "@/lib/authz";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateDeptForm } from "@/components/admin/create-dept-form";
import { ToggleDeptButton } from "@/components/admin/toggle-dept-button";

export default async function AdminDeptsPage() {
  const session = await auth();
  const u = session!.user as SessionUser;
  if (!isAdmin(u)) redirect("/dashboard");

  const depts = await prisma.department.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Admin
          </p>
          <h1 className="mt-1 text-display">Departments</h1>
          <p className="text-sm text-muted-foreground">
            {depts.length} department{depts.length === 1 ? "" : "s"}
          </p>
        </div>
        <CreateDeptForm />
      </div>
      <div className="grid gap-2">
        {depts.map((d) => (
          <Card key={d.id}>
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{d.name}</span>
                <span className="text-xs text-muted-foreground">/{d.slug}</span>
                {!d.isActive && <Badge variant="secondary">Inactive</Badge>}
              </div>
              <ToggleDeptButton deptId={d.id} deptName={d.name} isActive={d.isActive} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
