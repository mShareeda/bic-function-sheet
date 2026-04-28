"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { updateUserRolesAction } from "@/server/actions/admin";
import type { RoleName } from "@prisma/client";

const ROLES: RoleName[] = ["ADMIN", "COORDINATOR", "DEPT_MANAGER", "DEPT_TEAM_MEMBER"];

export function UserRolesForm({ userId, currentRoles }: { userId: string; currentRoles: RoleName[] }) {
  const [selected, setSelected] = useState<Set<RoleName>>(new Set(currentRoles));
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function toggle(r: RoleName) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r); else next.add(r);
      return next;
    });
  }

  function onSave() {
    setMsg(null);
    setConfirmOpen(true);
  }

  function doSave() {
    startTransition(async () => {
      const r = await updateUserRolesAction(userId, [...selected]);
      setConfirmOpen(false);
      if (r.ok) {
        setMsg("Roles saved.");
        setTimeout(() => setMsg(null), 4000);
      } else {
        setMsg(r.error);
      }
    });
  }

  const roleList = [...selected].join(", ") || "none";

  return (
    <>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Save roles?"
        description={`Set roles to: ${roleList}?`}
        confirmLabel="Save"
        onConfirm={doSave}
        pending={pending}
      />
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          {ROLES.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={selected.has(r)} onChange={() => toggle(r)} />
              {r}
            </label>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={onSave} disabled={pending}>
            {pending ? "Saving…" : "Save roles"}
          </Button>
          {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
        </div>
      </div>
    </>
  );
}
