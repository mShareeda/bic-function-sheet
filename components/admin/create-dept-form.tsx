"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { createDepartmentAction } from "@/server/actions/admin";

function slugify(name: string) {
  return name.toLowerCase().replace(/&/g, "and").replace(/\//g, "-").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function CreateDeptForm() {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [pendingData, setPendingData] = useState<FormData | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPendingData(new FormData(e.currentTarget));
    setConfirmOpen(true);
  }

  function onConfirm() {
    if (!pendingData) return;
    startTransition(async () => {
      const r = await createDepartmentAction(pendingData);
      if (r.ok) {
        setOpen(false);
        setConfirmOpen(false);
        setName("");
        setSlug("");
        setSuccess(`Department "${name}" created.`);
        setPendingData(null);
        setTimeout(() => setSuccess(null), 4000);
      } else {
        setConfirmOpen(false);
        setError(r.error);
      }
    });
  }

  if (!open) {
    return (
      <div className="flex flex-col items-end gap-2">
        {success && <p className="text-sm text-green-600">{success}</p>}
        <Button size="sm" onClick={() => { setSuccess(null); setOpen(true); }}>New department</Button>
      </div>
    );
  }

  return (
    <>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Create department?"
        description={`Create department "${name}" with slug "/${slug}"?`}
        confirmLabel="Create"
        onConfirm={onConfirm}
        pending={pending}
      />
      <form onSubmit={onSubmit} className="flex flex-wrap gap-2 items-end">
        <div className="space-y-1">
          <Label htmlFor="d-name" className="text-xs">Name</Label>
          <Input
            id="d-name"
            name="name"
            value={name}
            onChange={(e) => { setName(e.target.value); setSlug(slugify(e.target.value)); }}
            required
            className="w-64"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="d-slug" className="text-xs">Slug</Label>
          <Input
            id="d-slug"
            name="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            className="w-40"
          />
        </div>
        {error && <p className="w-full text-sm text-destructive">{error}</p>}
        <Button type="submit" size="sm" disabled={pending}>{pending ? "…" : "Add"}</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
      </form>
    </>
  );
}
