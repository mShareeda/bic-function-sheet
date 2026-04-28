import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStorage, LocalDiskStorage } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const { key } = await params;
  const storageKey = decodeURIComponent(key);

  // Verify attachment exists and user has access
  const attachment = await prisma.attachment.findFirst({ where: { storageKey } });
  if (!attachment) return new NextResponse("Not found", { status: 404 });

  const storage = getStorage();

  if (storage instanceof LocalDiskStorage) {
    const data = await (storage as LocalDiskStorage).readFile(storageKey);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": attachment.contentType,
        "Content-Disposition": `attachment; filename="${attachment.fileName}"`,
      },
    });
  }

  // Azure: redirect to signed URL
  const url = await storage.getDownloadUrl(storageKey);
  return NextResponse.redirect(url);
}
