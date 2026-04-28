"use client";

import { useTransition } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateEventStatusAction, sendFunctionSheetAction } from "@/server/actions/events";

const ALL_STATUSES = ["DRAFT","CONFIRMED","FUNCTION_SHEET_SENT","IN_SETUP","LIVE","CLOSED","ARCHIVED"] as const;
type Status = typeof ALL_STATUSES[number];

const NEXT: Record<Status, Status | null> = {
  DRAFT: "CONFIRMED",
  CONFIRMED: "FUNCTION_SHEET_SENT",
  FUNCTION_SHEET_SENT: "IN_SETUP",
  IN_SETUP: "LIVE",
  LIVE: "CLOSED",
  CLOSED: "ARCHIVED",
  ARCHIVED: null,
};

const ACTION_LABEL: Record<string, string> = {
  CONFIRMED: "Mark confirmed",
  FUNCTION_SHEET_SENT: "Send function sheet",
  IN_SETUP: "Mark in setup",
  LIVE: "Mark live",
  CLOSED: "Close event",
  ARCHIVED: "Archive",
};

export function StatusChanger({ eventId, currentStatus }: { eventId: string; currentStatus: string }) {
  const [pending, startTransition] = useTransition();
  const next = NEXT[currentStatus as Status];
  if (!next) return null;

  const label = ACTION_LABEL[next] ?? `→ ${next}`;

  function advance() {
    startTransition(async () => {
      if (next === "FUNCTION_SHEET_SENT") {
        await sendFunctionSheetAction(eventId);
      } else {
        await updateEventStatusAction(eventId, next!);
      }
    });
  }

  return (
    <Button
      size="sm"
      variant={next === "FUNCTION_SHEET_SENT" ? "default" : "outline"}
      onClick={advance}
      disabled={pending}
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
