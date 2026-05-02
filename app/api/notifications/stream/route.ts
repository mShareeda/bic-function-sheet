// Server-Sent Events stream for real-time notification counts.
//
// Each connected client receives an event immediately on connect, then every
// POLL_MS milliseconds, with their current unread notification count and the
// 10 most recent unread notifications.
//
// State is per-process — a second serverless instance won't share connections,
// but each SSE connection is self-contained (client → its own stream → its own
// DB poll), so correctness is preserved across instances.
//
// Vercel note: Node.js functions may run up to the project's max duration
// (300s on Pro). Clients reconnect automatically via EventSource retry logic,
// so brief function cold-starts are invisible to the user.

import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const POLL_MS = 10_000;
const KEEPALIVE_MS = 20_000;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userId = session.user.id;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      function enqueue(chunk: string) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      }

      async function sendSnapshot() {
        if (closed) return;
        try {
          const notifications = await prisma.notification.findMany({
            where: { userId, readAt: null },
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
              id: true,
              title: true,
              body: true,
              url: true,
              type: true,
              createdAt: true,
            },
          });
          const payload = JSON.stringify({
            unreadCount: notifications.length,
            notifications,
          });
          enqueue(`data: ${payload}\n\n`);
        } catch {
          closed = true;
          try { controller.close(); } catch { /* already closed */ }
        }
      }

      // Send immediately on connect
      await sendSnapshot();

      const pollTimer = setInterval(() => { void sendSnapshot(); }, POLL_MS);

      // Keep-alive comment to prevent proxies from closing idle connections
      const keepAliveTimer = setInterval(() => {
        enqueue(`: keep-alive\n\n`);
      }, KEEPALIVE_MS);

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(pollTimer);
        clearInterval(keepAliveTimer);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // prevent nginx from buffering the stream
    },
  });
}
