"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { createUserAction } from "@/server/actions/admin";

const ROLES = ["ADMIN", "COORDINATOR", "DEPT_MANAGER", "DEPT_TEAM_MEMBER"] as const;

export function CreateUserForm() {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [pendingData, setPendingData] = useState<FormData | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setPendingData(new FormData(e.currentTarget));
    setConfirmOpen(true);
  }

  function onConfirm() {
    if (!pendingData) return;
    startTransition(async () => {
      const r = await createUserAction(pendingData);
      if (r.ok) {
        setOpen(false);
        setConfirmOpen(false);
        setSuccess("User created successfully.");
        setPendingData(null);
        setPassword("");
        setConfirmPassword("");
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
        <Button size="sm" onClick={() => { setSuccess(null); setOpen(true); }}>New user</Button>
      </div>
    );
  }

  return (
    <>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Create user?"
        description="Create a new user account with the specified password?"
        confirmLabel="Create"
        onConfirm={onConfirm}
        pending={pending}
      />
      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border bg-card p-4 w-full max-w-md">
        <div className="space-y-2">
          <Label htmlFor="cu-name">Full name</Label>
          <Input id="cu-name" name="displayName" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cu-email">Email</Label>
          <Input id="cu-email" name="email" type="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cu-password">Password</Label>
          <Input
            id="cu-password"
            name="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 12 chars, upper + lower + digit + special"
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cu-confirm">Confirm password</Label>
          <Input
            id="cu-confirm"
            name="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <fieldset className="space-y-1">
          <legend className="text-sm font-medium">Roles</legend>
          <div className="flex flex-wrap gap-3">
            {ROLES.map((r) => (
              <label key={r} className="flex items-center gap-1 text-sm">
                <input type="checkbox" name="roles" value={r} />
                {r}
              </label>
            ))}
          </div>
        </fieldset>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={pending}>{pending ? "Creating…" : "Create"}</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => { setOpen(false); setError(null); setPassword(""); setConfirmPassword(""); }}>Cancel</Button>
        </div>
      </form>
    </>
  );
}
