import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMailer } from "@/lib/mailer";

export const maxDuration = 60;

export async function GET(req: Request) {
  // Verify Vercel cron secret (set CRON_SECRET in Vercel env vars)
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  // Find all undelivered FUNCTION_SHEET_UPDATED notifications grouped by (userId, eventId)
  const pending = await prisma.notification.findMany({
    where: {
      type: "FUNCTION_SHEET_UPDATED",
      emailedAt: null,
    },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  if (!pending.length) {
    return NextResponse.json({ processed: 0 });
  }

  // Group by userId + eventId
  const groups = new Map<string, typeof pending>();
  for (const n of pending) {
    const key = `${n.userId}:${n.eventId ?? ""}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(n);
  }

  const mailer = getMailer();
  let count = 0;

  for (const [, items] of groups) {
    const { user, eventId } = items[0];
    if (!user) continue;

    const eventUrl = eventId ? `${appUrl}/events/${eventId}` : appUrl;
    const changes = items.map((i) => `• ${i.title}`).join("\n");

    try {
      await mailer.send({
        to: user.email,
        subject: `Updates to a function sheet you're involved in`,
        text: `Hi ${user.displayName},\n\nThe following changes were made:\n\n${changes}\n\nView the function sheet: ${eventUrl}`,
        html: `<p>Hi ${user.displayName},</p><p>The following changes were made:</p><ul>${items.map((i) => `<li>${i.title}</li>`).join("")}</ul><p><a href="${eventUrl}">View the function sheet</a></p>`,
      });

      await prisma.notification.updateMany({
        where: { id: { in: items.map((i) => i.id) } },
        data: { emailedAt: new Date() },
      });
      count++;
    } catch (err) {
      console.error("Digest email failed for user", user.id, err);
    }
  }

  return NextResponse.json({ processed: count });
}
