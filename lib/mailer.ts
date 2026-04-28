/**
 * Mail driver. In dev (MAIL_DRIVER=console) emails are printed to stdout.
 * In prod set MAIL_DRIVER=resend and provide RESEND_API_KEY + EMAIL_FROM.
 */

export type MailMessage = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: { filename: string; content: Buffer | string; contentType?: string }[];
};

export interface Mailer {
  send(msg: MailMessage): Promise<void>;
}

class ConsoleMailer implements Mailer {
  async send(msg: MailMessage): Promise<void> {
    const recipients = Array.isArray(msg.to) ? msg.to.join(", ") : msg.to;
    console.log("\n=========== EMAIL (console driver) ===========");
    console.log(`To:      ${recipients}`);
    console.log(`Subject: ${msg.subject}`);
    if (msg.text) console.log(`---\n${msg.text}`);
    else console.log("(html only)");
    if (msg.attachments?.length) {
      console.log(
        `Attachments: ${msg.attachments.map((a) => a.filename).join(", ")}`,
      );
    }
    console.log("==============================================\n");
  }
}

class ResendMailer implements Mailer {
  async send(msg: MailMessage): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from) {
      throw new Error("RESEND_API_KEY and EMAIL_FROM must be set for Resend mailer");
    }
    const { Resend } = await import("resend");
    const client = new Resend(apiKey);
    await client.emails.send({
      from,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      attachments: msg.attachments?.map((a) => ({
        filename: a.filename,
        content: typeof a.content === "string" ? a.content : a.content.toString("base64"),
      })),
    });
  }
}

let cached: Mailer | undefined;
export function getMailer(): Mailer {
  if (cached) return cached;
  const driver = process.env.MAIL_DRIVER ?? "console";
  cached = driver === "resend" ? new ResendMailer() : new ConsoleMailer();
  return cached;
}
