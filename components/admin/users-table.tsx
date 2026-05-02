"use client";

import Link from "next/link";
import { CheckCircle2, XCircle, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";

export type UserRow = {
  id: string;
  displayName: string;
  email: string;
  isActive: boolean;
  ssoProvisionedAt: Date | null;
  roles: string[];
  departments: { name: string; isManager: boolean }[];
};

const columns: Column<UserRow>[] = [
  {
    key: "displayName",
    header: "Name",
    accessor: (u) => (
      <div className="flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
          {u.displayName
            .split(" ")
            .map((p) => p[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="font-medium truncate">{u.displayName}</p>
          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
        </div>
      </div>
    ),
    sortValue: (u) => u.displayName.toLowerCase(),
    searchValue: (u) => `${u.displayName} ${u.email}`,
    width: "30%",
  },
  {
    key: "isActive",
    header: "Status",
    accessor: (u) =>
      u.ssoProvisionedAt && !u.isActive ? (
        <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
          <span className="h-3.5 w-3.5 rounded-full border-2 border-amber-500 flex-shrink-0" />
          Pending Approval
        </span>
      ) : u.isActive ? (
        <span className="inline-flex items-center gap-1 text-xs text-status-live font-medium">
          <CheckCircle2 className="h-3.5 w-3.5" /> Active
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <XCircle className="h-3.5 w-3.5" /> Deactivated
        </span>
      ),
    sortValue: (u) => (u.ssoProvisionedAt && !u.isActive ? -1 : u.isActive ? 0 : 1),
  },
  {
    key: "roles",
    header: "Roles",
    accessor: (u) => (
      <div className="flex flex-wrap gap-1">
        {u.roles.length === 0 && (
          <span className="text-xs text-muted-foreground">—</span>
        )}
        {u.roles.map((r) => (
          <Badge key={r} variant="secondary" className="text-[10px]">
            {r}
          </Badge>
        ))}
      </div>
    ),
    searchValue: (u) => u.roles.join(" "),
  },
  {
    key: "departments",
    header: "Departments",
    accessor: (u) => (
      <div className="flex flex-wrap gap-1">
        {u.departments.length === 0 && (
          <span className="text-xs text-muted-foreground">—</span>
        )}
        {u.departments.map((d) => (
          <Badge key={d.name} variant="outline" className="text-[10px]">
            {d.name}
            {d.isManager && (
              <span className="ml-1 text-primary">★</span>
            )}
          </Badge>
        ))}
      </div>
    ),
    searchValue: (u) => u.departments.map((d) => d.name).join(" "),
  },
  {
    key: "actions",
    header: "",
    accessor: (u) => (
      <Button asChild variant="ghost" size="sm" className="h-8">
        <Link href={`/admin/users/${u.id}`}>
          Manage
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
    ),
    align: "right",
    width: "120px",
  },
];

export function UsersTable({ users }: { users: UserRow[] }) {
  return (
    <DataTable
      data={users}
      columns={columns}
      rowKey={(u) => u.id}
      searchPlaceholder="Search users by name, email, role..."
      pageSize={20}
      emptyTitle="No users match"
      emptyDescription="Try adjusting your search."
      initialSort={{ key: "displayName", dir: "asc" }}
    />
  );
}
