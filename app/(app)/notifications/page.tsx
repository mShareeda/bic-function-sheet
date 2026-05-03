import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NotificationList } from "@/components/notifications/notification-list";

export default async function NotificationsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <NotificationList
      initialItems={notifications.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        url: n.url,
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
      }))}
    />
  );
}
