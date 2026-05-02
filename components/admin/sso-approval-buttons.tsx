"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { approveSsoUserAction, rejectSsoUserAction } from "@/server/actions/admin";

export function SsoApprovalButtons({ userId, userName }: { userId: string; userName: string }) {
  const router = useRouter();
  const [approvePending, startApprove] = useTransition();
  const [rejectPending, startReject] = useTransition();

  function approve() {
    startApprove(async () => {
      const r = await approveSsoUserAction(userId);
      if (r.ok) router.refresh();
    });
  }

  function reject() {
    if (!confirm(`Reject and permanently remove "${userName}"? This cannot be undone.`)) return;
    startReject(async () => {
      await rejectSsoUserAction(userId);
    });
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={approve} disabled={approvePending || rejectPending}>
        <CheckCircle2 className="h-3.5 w-3.5" />
        Approve access
      </Button>
      <Button size="sm" variant="destructive" onClick={reject} disabled={approvePending || rejectPending}>
        <XCircle className="h-3.5 w-3.5" />
        Reject &amp; remove
      </Button>
    </div>
  );
}
