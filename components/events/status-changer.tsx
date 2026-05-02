"use client";

import { useTransition } from "react";
import { ArrowRight, Loader2, Send, FileClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  updateEventStatusAction,
  sendFunctionSheetAction,
  sendProvisionalFunctionSheetAction,
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

export function StatusChanger({
  eventId,
  currentStatus,
}: {
  eventId: string;
  currentStatus: string;
}) {
  const [pending, startTransition] = useTransition();

  // ── CONFIRMED: offer two send options ──────────────────────────────
  if (currentStatus === "CONFIRMED") {
    return (
      <div className="flex flex-wrap gap-2">
        {/* Primary: full function sheet */}
        <Button
          size="sm"
          variant="default"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await sendFunctionSheetAction(eventId);
            })
          }
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          Send function sheet
        </Button>

        {/* Secondary: provisional */}
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await sendProvisionalFunctionSheetAction(eventId);
            })
          }
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileClock className="h-3.5 w-3.5" />
          )}
          Send provisional
        </Button>
      </div>
    );
  }

  // ── PROVISIONAL_FUNCTION_SHEET_SENT: promote to full sheet ─────────
  if (currentStatus === "PROVISIONAL_FUNCTION_SHEET_SENT") {
    return (
      <Button
        size="sm"
        variant="default"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await sendFunctionSheetAction(eventId);
          })
        }
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Send className="h-3.5 w-3.5" />
        )}
        Confirm &amp; send function sheet
      </Button>
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
