import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStorage, newStorageKey, LocalDiskStorage } from "@/lib/storage";
import path from "node:path";
import fs from "node:fs/promises";

const MAX_BYTES = parseInt(process.env.MAX_ATTACHMENT_BYTES ?? "26214400", 10);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const eventId = url.searchParams.get("eventId");
  const requirementId = url.searchParams.get("requirementId");

  if (!eventId && !requirementId) {
    return NextResponse.json({ error: "Provide eventId or requirementId" }, { status: 400 });
  }
  if (eventId && requirementId) {
    return NextResponse.json({ error: "Provide only one of eventId or requirementId" }, { status: 400 });
  }

  const contentType = req.headers.get("content-type") ?? "application/octet-stream";
  const fileName = decodeURIComponent(url.searchParams.get("filename") ?? "file");
  const byteSize = parseInt(req.headers.get("content-length") ?? "0", 10);

  if (byteSize > MAX_BYTES) {
    return NextResponse.json({ error: `File exceeds ${MAX_BYTES} bytes limit` }, { status: 413 });
  }

  const folder = eventId ? `events/${eventId}` : `requirements/${requirementId}`;
  const storageKey = newStorageKey(folder, fileName);

  const storage = getStorage();
  // For local dev: read body and write to disk
  if (storage instanceof LocalDiskStorage) {
    const body = await req.arrayBuffer();
    await (storage as LocalDiskStorage).writeFile(storageKey, Buffer.from(body));
  }
  // For Azure: client should PUT directly to signed URL obtained from /api/attachments/presign

  const attachment = await prisma.attachment.create({
    data: {
      fileName,
      contentType,
      byteSize,
      storageKey,
      uploadedById: session.user.id,
      ...(eventId ? { eventId } : {}),
      ...(requirementId ? { requirementId } : {}),
    },
  });

  return NextResponse.json({ id: attachment.id, storageKey });
}
