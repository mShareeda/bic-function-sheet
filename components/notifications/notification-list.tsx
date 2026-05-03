"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { markOneReadAction, markAllReadAction } from "@/server/actions/notifications";
import { formatDistanceToNow } from "date-fns";

export type NotifItem = {
  id: string;
  title: string;
  body: string;
  url: string | null;
  readAt: string | null;
  createdAt: string;
};

function resolvePathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

export function NotificationList({ initialItems }: { initialItems: NotifItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [pending, startTransition] = useTransition();

  const unreadIds = items.filter((i) => !i.readAt).map((i) => i.id);

  function handleClick(n: NotifItem) {
    if (!n.readAt) {
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)),
      );
      markOneReadAction(n.id).catch(() => {});
    }
    if (n.url) router.push(resolvePathname(n.url));
  }

  function handleClearAll() {
    if (unreadIds.length === 0) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((x) => ({ ...x, readAt: x.readAt ?? now })));
    startTransition(async () => {
      await markAllReadAction(unreadIds);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Inbox
          </p>
          <h1 className="mt-1 text-display">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadIds.length} unread · {items.length} total
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={pending || unreadIds.length === 0}
          onClick={handleClearAll}
        >
          {pending ? "Clearing…" : "Clear all notifications"}
        </Button>
      </div>

      {items.length === 0 && (
        <p className="text-muted-foreground">No notifications yet.</p>
      )}

      <div className="space-y-2">
        {items.map((n) => (
          <Card
            key={n.id}
            className={cn(
              "cursor-pointer transition-colors hover:bg-muted/50",
              !n.readAt ? "border-primary/40 bg-primary/5" : "",
            )}
            onClick={() => handleClick(n)}
          >
            <CardContent className="py-3">
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    n.readAt ? "bg-transparent" : "bg-primary",
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-sm text-muted-foreground">{n.body}</p>
                  {n.url && (
                    <span className="mt-1 inline-block text-xs font-medium text-primary">
                      View update →
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
