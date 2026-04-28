import { prisma } from "@/lib/db";
import type { NotificationType } from "@prisma/client";
import { getMailer } from "@/lib/mailer";

type NotifyInput = {
  userIds: string[];
  type: NotificationType;
  title: string;
  body: string;
  eventId?: string;
  requirementId?: string;
  url?: string;
  sendEmail?: boolean;
  emailSubject?: string;
  emailHtml?: string;
  emailText?: string;
};

export async function notify(input: NotifyInput) {
  if (!input.userIds.length) return;

  await prisma.notification.createMany({
    data: input.userIds.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      eventId: input.eventId ?? null,
      requirementId: input.requirementId ?? null,
      url: input.url ?? null,
      emailedAt: input.sendEmail === false ? new Date() : null,
    })),
    skipDuplicates: false,
  });

  // Send immediate emails (non-digest types)
  if (input.sendEmail !== false && input.emailSubject) {
    const users = await prisma.user.findMany({
      where: { id: { in: input.userIds }, isActive: true },
    });
    const mailer = getMailer();
    for (const u of users) {
      try {
        await mailer.send({
          to: u.email,
          subject: input.emailSubject,
          html: input.emailHtml ?? `<p>${input.body}</p>`,
          text: input.emailText ?? input.body,
        });
        await prisma.notification.updateMany({
          where: { userId: u.id, type: input.type, eventId: input.eventId ?? null, emailedAt: null },
          data: { emailedAt: new Date() },
        });
      } catch (e) {
        console.error("[mailer]", e);
      }
    }
  }
}
