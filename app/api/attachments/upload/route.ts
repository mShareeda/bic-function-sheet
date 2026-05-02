import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStorage, newStorageKey, LocalDiskStorage } from "@/lib/storage";
import { validateUploadMeta, validateMagicBytes } from "@/lib/upload-validation";

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

  const declaredMime = req.headers.get("content-type") ?? "application/octet-stream";
  const fileName = decodeURIComponent(url.searchParams.get("filename") ?? "file");
  const byteSize = parseInt(req.headers.get("content-length") ?? "0", 10);

  if (byteSize > MAX_BYTES) {
    return NextResponse.json({ error: `File exceeds ${MAX_BYTES} bytes limit` }, { status: 413 });
  }

  // Validate filename extension and declared MIME type against allowlists.
  const metaCheck = validateUploadMeta(fileName, declaredMime);
  if (!metaCheck.ok) {
    return NextResponse.json({ error: metaCheck.reason }, { status: 415 });
  }

  const folder = eventId ? `events/${eventId}` : `requirements/${requirementId}`;
  const storageKey = newStorageKey(folder, fileName);

  const storage = getStorage();
  // For local dev: read body, sniff magic bytes, then write to disk.
  if (storage instanceof LocalDiskStorage) {
    const body = await req.arrayBuffer();
    const buf = new Uint8Array(body.slice(0, 16));
    const magicCheck = validateMagicBytes(buf);
    if (!magicCheck.ok) {
      return NextResponse.json({ error: magicCheck.reason }, { status: 415 });
    }
    await (storage as LocalDiskStorage).writeFile(storageKey, Buffer.from(body));
  }
  // For Azure: client PUTs directly to a signed URL. Extension + MIME checks above
  // are enforced server-side before the record is written.

  const attachment = await prisma.attachment.create({
    data: {
      fileName,
      contentType: metaCheck.resolvedMime,
      byteSize,
      storageKey,
      uploadedById: session.user.id,
      ...(eventId ? { eventId } : {}),
      ...(requirementId ? { requirementId } : {}),
    },
  });

  return NextResponse.json({ id: attachment.id, storageKey });
}
