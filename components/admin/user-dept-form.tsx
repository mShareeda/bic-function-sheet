"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { setDeptMembershipAction, removeDeptMembershipAction } from "@/server/actions/admin";

type Dept = { id: string; name: string };
type Membership = { departmentId: string; isManager: boolean; department: Dept };

export function UserDeptForm({
  userId,
  allDepts,
  currentMemberships,
}: {
  userId: string;
  allDepts: Dept[];
  currentMemberships: Membership[];
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [selectedDept, setSelectedDept] = useState("");
  const [asManager, setAsManager] = useState(false);
  const [confirmAdd, setConfirmAdd] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<Membership | null>(null);

  function onAdd() {
    if (!selectedDept) return;
    setConfirmAdd(true);
  }

  function doAdd() {
    startTransition(async () => {
      const r = await setDeptMembershipAction(userId, selectedDept, asManager);
      setConfirmAdd(false);
      const deptName = allDepts.find((d) => d.id === selectedDept)?.name ?? selectedDept;
      setMsg(r.ok ? `Added to ${deptName}.` : r.error);
      if (r.ok) {
        setSelectedDept("");
        setAsManager(false);
        setTimeout(() => setMsg(null), 4000);
      }
    });
  }

  function onRemove(m: Membership) {
    setConfirmRemove(m);
  }

  function doRemove() {
    if (!confirmRemove) return;
    const m = confirmRemove;
    startTransition(async () => {
      await removeDeptMembershipAction(userId, m.departmentId);
      setConfirmRemove(null);
      setMsg(`Removed from ${m.department.name}.`);
      setTimeout(() => setMsg(null), 4000);
    });
  }

  const selectedDeptName = allDepts.find((d) => d.id === selectedDept)?.name ?? "";

  return (
    <>
      <ConfirmDialog
        open={confirmAdd}
        onOpenChange={setConfirmAdd}
        title="Add department membership?"
        description={`Add this user to "${selectedDeptName}"${asManager ? " as a manager" : ""}?`}
        confirmLabel="Add"
        onConfirm={doAdd}
        pending={pending}
      />
      <ConfirmDialog
        open={!!confirmRemove}
        onOpenChange={(o) => { if (!o) setConfirmRemove(null); }}
        title="Remove department membership?"
        description={`Remove this user from "${confirmRemove?.department.name}"? They will lose access to that department's requirements.`}
        confirmLabel="Remove"
        destructive
        onConfirm={doRemove}
        pending={pending}
      />

      <div className="space-y-4">
        <ul className="space-y-2">
          {currentMemberships.map((m) => (
            <li key={m.departmentId} className="flex items-center justify-between text-sm">
              <span>
                {m.department.name}{" "}
                {m.isManager && <span className="text-primary font-medium">(manager)</span>}
              </span>
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => onRemove(m)}>
                Remove
              </Button>
            </li>
          ))}
          {currentMemberships.length === 0 && (
            <li className="text-sm text-muted-foreground">No department memberships.</li>
          )}
        </ul>
        <div className="flex flex-wrap gap-2 items-end">
          <select
            className="h-10 rounded-md border border-input px-3 text-sm"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
          >
            <option value="">— pick department —</option>
            {allDepts.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={asManager} onChange={(e) => setAsManager(e.target.checked)} />
            Manager
          </label>
          <Button size="sm" onClick={onAdd} disabled={pending || !selectedDept}>
            {pending ? "…" : "Add"}
          </Button>
        </div>
        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      </div>
    </>
  );
}
