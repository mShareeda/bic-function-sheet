"use client";

import { useState, useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteUserAction } from "@/server/actions/admin";

export function DeleteUserButton({ userId, userName }: { userId: string; userName: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!confirm(`Permanently delete "${userName}"? This cannot be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const r = await deleteUserAction(userId);
      // On success the server redirects, so we only get here on error
      if (!r.ok) setError(r.error);
    });
  }

  return (
    <div className="space-y-2">
      <Button
        size="sm"
        variant="destructive"
        disabled={pending}
        onClick={handleDelete}
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        Delete user
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
