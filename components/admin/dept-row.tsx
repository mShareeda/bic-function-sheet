"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  updateDepartmentAction,
  deleteDepartmentAction,
  toggleDepartmentActiveAction,
} from "@/server/actions/admin";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\//g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface DeptRowProps {
  deptId: string;
  name: string;
  slug: string;
  isActive: boolean;
}

export function DeptRow({ deptId, name, slug, isActive }: DeptRowProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editSlug, setEditSlug] = useState(slug);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [toggleOpen, setToggleOpen] = useState(false);

  const [pending, startTransition] = useTransition();

  // ── Edit ──────────────────────────────────────────────────────────────

  function startEdit() {
    setEditName(name);
    setEditSlug(slug);
    setEditError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setEditError(null);
  }

  function saveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEditError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateDepartmentAction(deptId, fd);
      if (result.ok) {
        setEditing(false);
      } else {
        setEditError(result.error);
      }
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────

  function confirmDelete() {
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteDepartmentAction(deptId);
      if (result.ok) {
        setDeleteOpen(false);
      } else {
        setDeleteOpen(false);
        setDeleteError(result.error);
      }
    });
  }

  // ── Toggle active ─────────────────────────────────────────────────────

  function confirmToggle() {
    startTransition(async () => {
      await toggleDepartmentActiveAction(deptId);
      setToggleOpen(false);
    });
  }

  // ── Render ────────────────────────────────────────────────────────────

  if (editing) {
    return (
      <form onSubmit={saveEdit} className="flex flex-wrap items-end gap-2 py-1">
        <div className="space-y-1">
          <Label htmlFor={`name-${deptId}`} className="text-xs">Name</Label>
          <Input
            id={`name-${deptId}`}
            name="name"
            value={editName}
            onChange={(e) => {
              setEditName(e.target.value);
              setEditSlug(slugify(e.target.value));
            }}
            required
            className="w-64 h-8 text-sm"
            autoFocus
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`slug-${deptId}`} className="text-xs">Slug</Label>
          <Input
            id={`slug-${deptId}`}
            name="slug"
            value={editSlug}
            onChange={(e) => setEditSlug(e.target.value)}
            required
            className="w-40 h-8 text-sm"
          />
        </div>
        {editError && (
          <p className="w-full text-xs text-destructive">{editError}</p>
        )}
        <div className="flex items-center gap-1">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Save
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={cancelEdit} disabled={pending}>
            <X className="h-3.5 w-3.5" /> Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <>
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete department?"
        description={`Permanently delete "${name}"? This cannot be undone. The department must not be used in any events.`}
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        pending={pending}
      />
      <ConfirmDialog
        open={toggleOpen}
        onOpenChange={setToggleOpen}
        title={isActive ? "Disable department?" : "Enable department?"}
        description={
          isActive
            ? `Disable "${name}"? It will no longer appear when creating new events.`
            : `Enable "${name}"? It will be available again when creating new events.`
        }
        confirmLabel={isActive ? "Disable" : "Enable"}
        destructive={isActive}
        onConfirm={confirmToggle}
        pending={pending}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 py-0.5">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-medium truncate">{name}</span>
          <span className="text-xs text-muted-foreground shrink-0">/{slug}</span>
          {!isActive && <Badge variant="secondary">Inactive</Badge>}
          {deleteError && (
            <span className="text-xs text-destructive">{deleteError}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={startEdit}
            disabled={pending}
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span className="sr-only">Edit</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setDeleteError(null); setDeleteOpen(true); }}
            disabled={pending}
            className="h-7 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="sr-only">Delete</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setToggleOpen(true)}
            disabled={pending}
            className="h-7 px-2"
          >
            {isActive ? "Disable" : "Enable"}
          </Button>
        </div>
      </div>
    </>
  );
}
