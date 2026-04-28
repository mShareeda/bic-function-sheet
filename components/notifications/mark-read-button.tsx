"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { markAllReadAction } from "@/server/actions/notifications";

export function MarkReadButton({ ids }: { ids: string[] }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await markAllReadAction(ids);
          router.refresh();
        })
      }
    >
      {pending ? "…" : "Mark all read"}
    </Button>
  );
}
