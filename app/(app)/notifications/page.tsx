import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { MarkReadButton } from "@/components/notifications/mark-read-button";
import { formatDistanceToNow } from "date-fns";

export default async function NotificationsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unread = notifications.filter((n) => !n.readAt);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Inbox
          </p>
          <h1 className="mt-1 text-display">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unread.length} unread · {notifications.length} total
          </p>
        </div>
        {unread.length > 0 && <MarkReadButton ids={unread.map((n) => n.id)} />}
      </div>
      {notifications.length === 0 && <p className="text-muted-foreground">No notifications yet.</p>}
      <div className="space-y-2">
        {notifications.map((n) => (
          <Card key={n.id} className={!n.readAt ? "border-primary/40 bg-primary/5" : ""}>
            <CardContent className="py-3">
              <div className="flex items-start gap-3">
                {!n.readAt && <span className="mt-1.5 w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                <div className="flex-1">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-sm text-muted-foreground">{n.body}</p>
                  {n.url && (
                    <Link href={n.url} className="text-xs text-primary underline mt-1 inline-block">
                      View →
                    </Link>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(n.createdAt, { addSuffix: true })}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
