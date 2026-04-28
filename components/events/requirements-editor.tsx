"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  upsertRequirementAction,
  deleteRequirementAction,
  assignTeamMemberAction,
  unassignTeamMemberAction,
  addManagerNoteAction,
} from "@/server/actions/requirements";
import { AttachmentPanel } from "@/components/events/attachment-panel";
import type { AttachmentItem } from "@/components/events/attachment-panel";

type Member = { id: string; displayName: string };
type Note = { id: string; body: string; author: { id: string; displayName: string }; createdAt: Date };
type Assignment = { userId: string; user: { id: string; displayName: string } };
type Requirement = {
  id: string; description: string; priority: string | null; sortOrder: number;
  assignments: Assignment[]; managerNotes: Note[]; attachments: AttachmentItem[];
};

export function RequirementsEditor({
  eventId, deptId, requirements, deptMembers, canAssign, canAddNotes, canManageAttachments,
}: {
  eventId: string; deptId: string;
  requirements: Requirement[]; deptMembers: Member[];
  canAssign: boolean; canAddNotes: boolean; canManageAttachments: boolean;
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
      startTransition(async () => {
        const r = await upsertRequirementAction(eventId, deptId, requirementId, fd);
        if (r.ok) { setShowAdd(false); setEditId(null); }
        else setError(r.error);
      });
    };
  }

  function delReq(id: string) {
    startTransition(async () => {
      await deleteRequirementAction(id, eventId);
    });
  }

  function assign(requirementId: string, userId: string) {
    startTransition(async () => {
      await assignTeamMemberAction(requirementId, userId, eventId);
    });
  }

  function unassign(requirementId: string, userId: string) {
    startTransition(async () => {
      await unassignTeamMemberAction(requirementId, userId, eventId);
    });
  }

  return (
    <div className="space-y-4">
      {requirements.map((req) => (
        <Card key={req.id}>
          <CardContent className="py-4 space-y-3">
            {editId === req.id ? (
              <ReqForm req={req} onSubmit={submitReq(req.id)} pending={pending} onCancel={() => setEditId(null)} error={error} />
            ) : (
              <>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex-1">
                    <p className="text-sm whitespace-pre-wrap">{req.description}</p>
                    {req.priority && <Badge variant="outline" className="mt-1 text-xs">{req.priority}</Badge>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditId(req.id)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => delReq(req.id)} disabled={pending}>Delete</Button>
                  </div>
                </div>

                {/* Assignments */}
                {canAssign && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Assigned team</p>
                    <div className="flex flex-wrap gap-2">
                      {req.assignments.map((a) => (
                        <span key={a.userId} className="flex items-center gap-1 text-xs bg-muted rounded-full px-3 py-1">
                          {a.user.displayName}
                          <button type="button" onClick={() => unassign(req.id, a.userId)} disabled={pending} className="text-muted-foreground hover:text-destructive ml-1">×</button>
                        </span>
                      ))}
                    </div>
                    <AssignSelect
                      requirementId={req.id}
                      members={deptMembers}
                      assignedIds={req.assignments.map((a) => a.userId)}
                      onAssign={assign}
                      pending={pending}
                    />
                  </div>
                )}

                {/* Manager notes */}
                {req.managerNotes.length > 0 && (
                  <div className="space-y-1 border-t pt-2">
                    <p className="text-xs font-medium text-muted-foreground">Notes (visible to coordinator only)</p>
                    {req.managerNotes.map((n) => (
                      <div key={n.id} className="text-sm bg-yellow-50 border border-yellow-200 rounded p-2">
                        <p>{n.body}</p>
                        <p className="text-xs text-muted-foreground mt-1">{n.author.displayName}</p>
                      </div>
                    ))}
                  </div>
                )}

                {canAddNotes && (
                  <NoteForm requirementId={req.id} eventId={eventId} pending={pending} />
                )}

                {/* Attachments */}
                {(canManageAttachments || req.attachments.length > 0) && (
                  <div className="border-t pt-2 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Attachments</p>
                    <AttachmentPanel
                      attachments={req.attachments}
                      scope={{ requirementId: req.id }}
                      canUpload={canManageAttachments}
                      canDelete={canManageAttachments}
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      ))}

      {showAdd ? (
        <Card>
          <CardContent className="py-4">
            <ReqForm onSubmit={submitReq(null)} pending={pending} onCancel={() => setShowAdd(false)} error={error} />
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setShowAdd(true)}>+ Add requirement</Button>
      )}
    </div>
  );
}

function ReqForm({ req, onSubmit, pending, onCancel, error }: {
  req?: Requirement; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  pending: boolean; onCancel: () => void; error: string | null;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Description *</Label>
        <textarea name="description" defaultValue={req?.description}
          className="w-full rounded-md border border-input px-3 py-2 text-sm min-h-[80px]" required />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Priority (optional)</Label>
        <Input name="priority" defaultValue={req?.priority ?? ""} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>{pending ? "…" : "Save"}</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

function AssignSelect({ requirementId, members, assignedIds, onAssign, pending }: {
  requirementId: string; members: Member[]; assignedIds: string[];
  onAssign: (reqId: string, userId: string) => void; pending: boolean;
}) {
  const available = members.filter((m) => !assignedIds.includes(m.id));
  if (!available.length) return null;
  return (
    <select
      className="h-9 rounded-md border border-input px-3 text-sm"
      onChange={(e) => { if (e.target.value) { onAssign(requirementId, e.target.value); e.target.value = ""; } }}
      disabled={pending}
    >
      <option value="">+ Assign team member…</option>
      {available.map((m) => <option key={m.id} value={m.id}>{m.displayName}</option>)}
    </select>
  );
}

function NoteForm({ requirementId, eventId, pending }: { requirementId: string; eventId: string; pending: boolean }) {
  const [body, setBody] = useState("");
  const [localPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    startTransition(async () => {
      await addManagerNoteAction(requirementId, eventId, body.trim());
      setBody("");
    });
  }

  return (
    <form onSubmit={submit} className="flex gap-2 border-t pt-2">
      <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a note (visible to coordinator only)…" className="flex-1 text-sm" />
      <Button type="submit" size="sm" variant="outline" disabled={localPending || pending || !body.trim()}>Send</Button>
    </form>
  );
}
