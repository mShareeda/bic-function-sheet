"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  addEventDepartmentAction,
  removeEventDepartmentAction,
  upsertRequirementAction,
  deleteRequirementAction,
} from "@/server/actions/requirements";

type Dept = { id: string; name: string };
type Requirement = { id: string; description: string; priority: string | null; sortOrder: number };

export function InlineDeptRequirements({
  eventId,
  allDepts,
  initialDepts,
}: {
  eventId: string;
  allDepts: Dept[];
  initialDepts: { deptId: string; requirements: Requirement[] }[];
}) {
  const [activeDeptIds, setActiveDeptIds] = useState<string[]>(
    initialDepts.map((d) => d.deptId)
  );
  const [reqsByDept, setReqsByDept] = useState<Record<string, Requirement[]>>(
    Object.fromEntries(initialDepts.map((d) => [d.deptId, d.requirements]))
  );
  const [pending, startTransition] = useTransition();

  function toggleDept(deptId: string) {
    startTransition(async () => {
      if (activeDeptIds.includes(deptId)) {
        await removeEventDepartmentAction(eventId, deptId);
        setActiveDeptIds((prev) => prev.filter((id) => id !== deptId));
      } else {
        await addEventDepartmentAction(eventId, deptId);
        setActiveDeptIds((prev) => [...prev, deptId]);
        if (!reqsByDept[deptId]) setReqsByDept((prev) => ({ ...prev, [deptId]: [] }));
      }
    });
  }

  function onReqSaved(deptId: string, req: Requirement) {
    setReqsByDept((prev) => {
      const existing = prev[deptId] ?? [];
      const idx = existing.findIndex((r) => r.id === req.id);
      if (idx >= 0) {
        const updated = [...existing];
        updated[idx] = req;
        return { ...prev, [deptId]: updated };
      }
      return { ...prev, [deptId]: [...existing, req] };
    });
  }

  function onReqDeleted(deptId: string, reqId: string) {
    setReqsByDept((prev) => ({
      ...prev,
      [deptId]: (prev[deptId] ?? []).filter((r) => r.id !== reqId),
    }));
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold mb-1">Departments</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Select departments involved in this event. Their requirements appear inline below.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {allDepts.map((d) => {
            const active = activeDeptIds.includes(d.id);
            return (
              <button
                key={d.id}
                type="button"
                disabled={pending}
                onClick={() => toggleDept(d.id)}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm text-left transition-colors ${
                  active
                    ? "border-primary bg-primary/5 text-primary font-medium"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <span>{d.name}</span>
                {active && <Badge variant="default" className="text-xs">Added</Badge>}
              </button>
            );
          })}
        </div>
        {activeDeptIds.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">{activeDeptIds.length} department(s) selected.</p>
        )}
      </div>

      {activeDeptIds.length > 0 && (
        <div className="space-y-4 pt-2">
          <h3 className="font-semibold">Requirements by department</h3>
          {activeDeptIds.map((deptId) => {
            const dept = allDepts.find((d) => d.id === deptId);
            if (!dept) return null;
            const reqs = reqsByDept[deptId] ?? [];
            return (
              <DeptRequirementsSection
                key={deptId}
                eventId={eventId}
                dept={dept}
                requirements={reqs}
                onSaved={(req) => onReqSaved(deptId, req)}
                onDeleted={(reqId) => onReqDeleted(deptId, reqId)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function DeptRequirementsSection({
  eventId,
  dept,
  requirements,
  onSaved,
  onDeleted,
}: {
  eventId: string;
  dept: Dept;
  requirements: Requirement[];
  onSaved: (req: Requirement) => void;
  onDeleted: (reqId: string) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submitReq(requirementId: string | null) {
    return (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);
      const fd = new FormData(e.currentTarget);
      const description = String(fd.get("description") ?? "").trim();
      const priority = String(fd.get("priority") ?? "").trim() || null;
      startTransition(async () => {
        const r = await upsertRequirementAction(eventId, dept.id, requirementId, fd);
        if (r.ok) {
          const fakeId = requirementId ?? `temp-${Date.now()}`;
          onSaved({ id: fakeId, description, priority, sortOrder: 0 });
          setShowAdd(false);
          setEditId(null);
        } else {
          setError(r.error);
        }
      });
    };
  }

  function delReq(reqId: string) {
    startTransition(async () => {
      await deleteRequirementAction(reqId, eventId);
      onDeleted(reqId);
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{dept.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {requirements.map((req) =>
          editId === req.id ? (
            <InlineReqForm
              key={req.id}
              req={req}
              onSubmit={submitReq(req.id)}
              onCancel={() => setEditId(null)}
              pending={pending}
              error={error}
            />
          ) : (
            <div key={req.id} className="flex items-start justify-between gap-3 border rounded-md p-3">
              <div className="flex-1">
                <p className="text-sm whitespace-pre-wrap">{req.description}</p>
                {req.priority && (
                  <Badge variant="outline" className="mt-1 text-xs">{req.priority}</Badge>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => setEditId(req.id)}>Edit</Button>
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => delReq(req.id)}>Delete</Button>
              </div>
            </div>
          )
        )}

        {requirements.length === 0 && !showAdd && (
          <p className="text-sm text-muted-foreground">No requirements yet.</p>
        )}

        {showAdd ? (
          <InlineReqForm
            onSubmit={submitReq(null)}
            onCancel={() => setShowAdd(false)}
            pending={pending}
            error={error}
          />
        ) : (
          <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
            + Add requirement
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function InlineReqForm({
  req,
  onSubmit,
  onCancel,
  pending,
  error,
}: {
  req?: Requirement;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  pending: boolean;
  error: string | null;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3 border rounded-md p-3">
      <div className="space-y-1">
        <Label className="text-xs">Description *</Label>
        <textarea
          name="description"
          defaultValue={req?.description}
          className="w-full rounded-md border border-input px-3 py-2 text-sm min-h-[72px]"
          required
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Priority (optional)</Label>
        <Input name="priority" defaultValue={req?.priority ?? ""} className="h-8 text-sm" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>{pending ? "…" : "Save"}</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
