"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toggleDepartmentActiveAction } from "@/server/actions/admin";

export function ToggleDeptButton({
  deptId,
  deptName,
  isActive,
}: {
  deptId: string;
  deptName: string;
  isActive: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      await toggleDepartmentActiveAction(deptId);
      setConfirmOpen(false);
      setSuccess(isActive ? `"${deptName}" disabled.` : `"${deptName}" enabled.`);
      setTimeout(() => setSuccess(null), 4000);
    });
  }

  return (
    <>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={isActive ? "Disable department?" : "Enable department?"}
        description={
          isActive
            ? `Disable "${deptName}"? It will no longer be available for new events.`
            : `Enable "${deptName}"? It will become available for new events again.`
        }
        confirmLabel={isActive ? "Disable" : "Enable"}
        destructive={isActive}
        onConfirm={onConfirm}
        pending={pending}
      />
      <div className="flex items-center gap-3">
        {success && <span className="text-xs text-green-600">{success}</span>}
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => setConfirmOpen(true)}
        >
          {isActive ? "Disable" : "Enable"}
        </Button>
      </div>
    </>
  );
}
