"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { addEventDepartmentAction, removeEventDepartmentAction } from "@/server/actions/requirements";

type Dept = { id: string; name: string };

export function DepartmentPicker({
  eventId,
  allDepts,
  activeDeptIds,
}: {
  eventId: string;
  allDepts: Dept[];
  activeDeptIds: string[];
}) {
  const [pending, startTransition] = useTransition();
  const activeSet = new Set(activeDeptIds);

  function toggle(deptId: string) {
    startTransition(async () => {
      if (activeSet.has(deptId)) {
        await removeEventDepartmentAction(eventId, deptId);
      } else {
        await addEventDepartmentAction(eventId, deptId);
      }
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Select all departments involved in this event.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {allDepts.map((d) => (
          <button
            key={d.id}
            type="button"
            disabled={pending}
            onClick={() => toggle(d.id)}
            className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm text-left transition-colors ${
              activeSet.has(d.id)
                ? "border-primary bg-primary/5 text-primary font-medium"
                : "border-border hover:bg-muted/50"
            }`}
          >
            <span>{d.name}</span>
            {activeSet.has(d.id) && <Badge variant="default" className="text-xs">Added</Badge>}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{activeDeptIds.length} departments selected.</p>
    </div>
  );
}
