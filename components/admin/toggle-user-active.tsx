"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toggleUserActiveAction } from "@/server/actions/admin";

export function ToggleUserActiveButton({
  userId,
  userName,
  isActive,
}: {
  userId: string;
  userName: string;
  isActive: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      await toggleUserActiveAction(userId);
      setConfirmOpen(false);
      setSuccess(isActive ? `"${userName}" deactivated.` : `"${userName}" reactivated.`);
      setTimeout(() => setSuccess(null), 4000);
    });
  }

  return (
    <>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={isActive ? "Deactivate user?" : "Reactivate user?"}
        description={
          isActive
            ? `Deactivate "${userName}"? They will no longer be able to sign in.`
            : `Reactivate "${userName}"? They will be able to sign in again.`
        }
        confirmLabel={isActive ? "Deactivate" : "Reactivate"}
        destructive={isActive}
        onConfirm={onConfirm}
        pending={pending}
      />
      <div className="flex items-center gap-2">
        {success && <span className="text-xs text-green-600">{success}</span>}
        <Button
          variant={isActive ? "destructive" : "secondary"}
          size="sm"
          disabled={pending}
          onClick={() => setConfirmOpen(true)}
        >
          {isActive ? "Deactivate" : "Reactivate"}
        </Button>
      </div>
    </>
  );
}
