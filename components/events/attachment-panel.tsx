"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteAttachmentAction } from "@/server/actions/attachments";

export type AttachmentItem = {
  id: string;
  fileName: string;
  byteSize: number;
  storageKey: string;
  createdAt: string;
  uploadedBy: { displayName: string };
};

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1_048_576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1_048_576).toFixed(1)} MB`;
}

const MAX_CLIENT_BYTES = 25 * 1024 * 1024;

export function AttachmentPanel({
  attachments,
  scope,
  canUpload,
  canDelete,
}: {
  attachments: AttachmentItem[];
  scope: { eventId: string } | { requirementId: string };
  canUpload: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.size > MAX_CLIENT_BYTES) {
      setError("File exceeds 25 MB limit.");
      return;
    }
    setError(null);
    setUploading(true);

    const scopeParam =
      "eventId" in scope
        ? `eventId=${encodeURIComponent(scope.eventId)}`
        : `requirementId=${encodeURIComponent(scope.requirementId)}`;

    try {
      const res = await fetch(
        `/api/attachments/upload?${scopeParam}&filename=${encodeURIComponent(file.name)}`,
        {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? `Upload failed (${res.status}).`);
      } else {
        router.refresh();
      }
    } catch {
      setError("Upload failed. Check your connection.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleDelete(id: string) {
    setError(null);
    startTransition(async () => {
      const r = await deleteAttachmentAction(id);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {attachments.length > 0 ? (
        <ul className="space-y-2">
          {attachments.map((att) => (
            <li key={att.id} className="flex items-center gap-3 text-sm">
              <a
                href={`/api/attachments/${encodeURIComponent(att.storageKey)}`}
                className="flex-1 text-primary underline-offset-2 hover:underline truncate"
              >
                {att.fileName}
              </a>
              <span className="text-muted-foreground whitespace-nowrap text-xs">
                {formatBytes(att.byteSize)}
              </span>
              <span className="text-muted-foreground whitespace-nowrap text-xs hidden sm:inline">
                {att.uploadedBy.displayName}
              </span>
              <span className="text-muted-foreground whitespace-nowrap text-xs">
                {new Date(att.createdAt).toLocaleDateString()}
              </span>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => handleDelete(att.id)}
                  disabled={pending}
                  className="text-muted-foreground hover:text-destructive text-xs shrink-0"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No attachments yet.</p>
      )}

      {canUpload && (
        <>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={uploading || pending}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? "Uploading…" : "Attach file"}
          </Button>
        </>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
