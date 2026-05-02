"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Loader2, Send, FileClock, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  updateEventStatusAction,
  sendFunctionSheetAction,
  sendProvisionalFunctionSheetAction,
  checkEventReadinessAction,
  type ReadinessCheck,
} from "@/server/actions/events";

const ALL_STATUSES = [
  "DRAFT",
  "CONFIRMED",
  "PROVISIONAL_FUNCTION_SHEET_SENT",
  "FUNCTION_SHEET_SENT",
  "IN_SETUP",
  "LIVE",
  "CLOSED",
  "ARCHIVED",
] as const;
type Status = (typeof ALL_STATUSES)[number];

// Linear next status — used for all steps except CONFIRMED (which has two options)
const NEXT: Record<Status, Status | null> = {
  DRAFT: "CONFIRMED",
  CONFIRMED: "FUNCTION_SHEET_SENT", // handled specially below
  PROVISIONAL_FUNCTION_SHEET_SENT: "FUNCTION_SHEET_SENT",
  FUNCTION_SHEET_SENT: "IN_SETUP",
  IN_SETUP: "LIVE",
  LIVE: "CLOSED",
  CLOSED: "ARCHIVED",
  ARCHIVED: null,
};

const ACTION_LABEL: Partial<Record<Status, string>> = {
  CONFIRMED: "Mark confirmed",
  FUNCTION_SHEET_SENT: "Send function sheet",
  IN_SETUP: "Mark in setup",
  LIVE: "Mark live",
  CLOSED: "Close event",
  ARCHIVED: "Archive",
};

// ── Readiness Dialog ─────────────────────────────────────────────────────────

function ReadinessDialog({
  checks,
  allPassed,
  onConfirm,
  onCancel,
  pending,
}: {
  checks: ReadinessCheck[];
  allPassed: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  pending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border bg-card shadow-xl p-6 mx-4 space-y-4 animate-in fade-in-0 zoom-in-95">
        <h2 className="text-base font-semibold">
          {allPassed ? "Ready to send?" : "Function sheet not ready"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {allPassed
            ? "All readiness checks passed. This will send notifications to all assigned department managers."
            : "Some checks have not passed. You can still send, but department managers may receive an incomplete sheet."}
        </p>
        <ul className="space-y-2">
          {checks.map((c) => (
            <li key={c.label} className="flex items-start gap-2 text-sm">
              {c.passed ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-live" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              )}
              <span>
                <span className={c.passed ? "text-foreground" : "text-destructive font-medium"}>
                  {c.label}
                </span>
                {c.detail && (
                  <span className="block text-xs text-muted-foreground">{c.detail}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant={allPassed ? "default" : "destructive"}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {allPassed ? "Send" : "Send anyway"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function StatusChanger({
  eventId,
  currentStatus,
}: {
  eventId: string;
  currentStatus: string;
}) {
  const [pending, startTransition] = useTransition();
  const [readinessChecks, setReadinessChecks] = useState<ReadinessCheck[] | null>(null);
  const [allPassed, setAllPassed] = useState(false);
  const [pendingAction, setPendingAction] = useState<"full" | "provisional" | null>(null);

  function requestSend(kind: "full" | "provisional") {
    startTransition(async () => {
      const result = await checkEventReadinessAction(eventId);
      if (!result.ok) return;
      setReadinessChecks(result.checks);
      setAllPassed(result.allPassed);
      setPendingAction(kind);
    });
  }

  function confirmSend() {
    if (!pendingAction) return;
    const action = pendingAction === "full" ? sendFunctionSheetAction : sendProvisionalFunctionSheetAction;
    setReadinessChecks(null);
    setPendingAction(null);
    startTransition(async () => {
      await action(eventId);
    });
  }

  function cancelSend() {
    setReadinessChecks(null);
    setPendingAction(null);
  }

  // ── CONFIRMED: offer two send options ──────────────────────────────
  if (currentStatus === "CONFIRMED") {
    return (
      <>
        {readinessChecks && (
          <ReadinessDialog
            checks={readinessChecks}
            allPassed={allPassed}
            onConfirm={confirmSend}
            onCancel={cancelSend}
            pending={pending}
          />
        )}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="default" disabled={pending} onClick={() => requestSend("full")}>
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Send function sheet
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => requestSend("provisional")}>
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileClock className="h-3.5 w-3.5" />}
            Send provisional
          </Button>
        </div>
      </>
    );
  }

  // ── PROVISIONAL_FUNCTION_SHEET_SENT: promote to full sheet ─────────
  if (currentStatus === "PROVISIONAL_FUNCTION_SHEET_SENT") {
    return (
      <>
        {readinessChecks && (
          <ReadinessDialog
            checks={readinessChecks}
            allPassed={allPassed}
            onConfirm={confirmSend}
            onCancel={cancelSend}
            pending={pending}
          />
        )}
        <Button size="sm" variant="default" disabled={pending} onClick={() => requestSend("full")}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Confirm &amp; send function sheet
        </Button>
      </>
    );
  }

  // ── All other statuses: single linear advance button ───────────────
  const next = NEXT[currentStatus as Status];
  if (!next) return null;

  const label = ACTION_LABEL[next] ?? `→ ${next}`;

  return (
    <Button
      size="sm"
      variant={next === "FUNCTION_SHEET_SENT" ? "default" : "outline"}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await updateEventStatusAction(eventId, next);
        })
      }
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <ArrowRight className="h-3.5 w-3.5" />
      )}
      {label}
    </Button>
  );
}
