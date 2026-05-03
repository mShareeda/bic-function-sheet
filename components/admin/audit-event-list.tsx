"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { AuditEventGroup, AuditEntry } from "@/app/(app)/admin/audit/page";

const TS_FORMAT = "HH:mm dd-MMMM-yyyy";

function AuditEntryRow({ entry }: { entry: AuditEntry }) {
  return (
    <div className="flex flex-wrap items-start gap-3 text-sm py-2 border-b last:border-0">
      <Badge variant="outline" className="text-xs shrink-0">{entry.action}</Badge>
      <span className="font-medium">{entry.entityType}</span>
      <span className="text-muted-foreground truncate max-w-[200px] text-xs">{entry.entityId}</span>
      {entry.message && (
        <span className="text-muted-foreground text-xs">{entry.message}</span>
      )}
      <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap tabular-nums">
        {entry.actorName ?? "system"} ·{" "}
        {format(new Date(entry.createdAt), TS_FORMAT)}
      </span>
    </div>
  );
}

function EventGroup({ group }: { group: AuditEventGroup }) {
  const [expanded, setExpanded] = useState(false);

  const title = group.maximizerNumber
    ? `${group.eventTitle} — ${group.maximizerNumber}`
    : group.eventTitle;

  return (
    <Card>
      <button
        type="button"
        className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors rounded-lg"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-medium truncate">{title}</span>
          <span className="text-xs text-muted-foreground shrink-0">
            {group.entries.length} {group.entries.length === 1 ? "entry" : "entries"}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-muted-foreground hidden sm:block tabular-nums">
            {format(new Date(group.latestAt), TS_FORMAT)}
          </span>
          <span className="text-muted-foreground text-sm">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded && (
        <CardContent className="pt-0 pb-3 px-4">
          <div className="divide-y">
            {group.entries.map((entry) => (
              <AuditEntryRow key={entry.id} entry={entry} />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function AuditEventList({
  eventGroups,
  systemEntries,
}: {
  eventGroups: AuditEventGroup[];
  systemEntries: AuditEntry[];
}) {
  const [systemExpanded, setSystemExpanded] = useState(false);

  return (
    <div className="space-y-2">
      {eventGroups.map((group) => (
        <EventGroup key={group.eventId} group={group} />
      ))}

      {eventGroups.length === 0 && systemEntries.length === 0 && (
        <p className="text-sm text-muted-foreground">No audit log entries found.</p>
      )}

      {systemEntries.length > 0 && (
        <Card>
          <button
            type="button"
            className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors rounded-lg"
            onClick={() => setSystemExpanded((v) => !v)}
            aria-expanded={systemExpanded}
          >
            <div className="flex items-center gap-3">
              <span className="font-medium text-muted-foreground">System / Admin activity</span>
              <span className="text-xs text-muted-foreground">
                {systemEntries.length} {systemEntries.length === 1 ? "entry" : "entries"}
              </span>
            </div>
            <span className="text-muted-foreground text-sm">{systemExpanded ? "▲" : "▼"}</span>
          </button>
          {systemExpanded && (
            <CardContent className="pt-0 pb-3 px-4">
              <div className="divide-y">
                {systemEntries.map((entry) => (
                  <AuditEntryRow key={entry.id} entry={entry} />
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
