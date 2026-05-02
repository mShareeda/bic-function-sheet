// Allowed MIME types for attachments.
const MIME_ALLOWLIST = new Set([
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // Text
  "text/plain",
  "text/csv",
  // Archives (safe when contents aren't executed)
  "application/zip",
  "application/x-zip-compressed",
]);

// Extensions that must be rejected regardless of declared MIME type.
// Covers executables, scripts, and other dangerous formats.
const BLOCKED_EXTENSIONS = new Set([
  ".exe", ".bat", ".cmd", ".com", ".msi", ".msp",
  ".sh", ".bash", ".zsh", ".fish", ".ksh",
  ".ps1", ".psm1", ".psd1", ".ps1xml",
  ".vbs", ".vbe", ".wsf", ".wsh", ".js", ".jse",
  ".jar", ".class", ".war", ".ear",
  ".app", ".dmg", ".pkg",
  ".elf", ".so", ".dll", ".sys", ".drv",
  ".lnk", ".url", ".scr",
  ".php", ".php3", ".php4", ".php5", ".phtml",
  ".asp", ".aspx", ".cgi", ".pl", ".py", ".rb",
  ".htaccess", ".htpasswd",
]);

// Magic byte signatures for dangerous formats.
// Checked against the first bytes of the uploaded content.
type MagicEntry = { bytes: number[]; mask?: number[]; label: string };

const BLOCKED_MAGIC: MagicEntry[] = [
  // Windows PE executable (EXE/DLL/SYS)
  { bytes: [0x4d, 0x5a], label: "Windows PE executable" },
  // ELF executable (Linux)
  { bytes: [0x7f, 0x45, 0x4c, 0x46], label: "ELF executable" },
  // Mach-O executable (macOS) — 32-bit
  { bytes: [0xfe, 0xed, 0xfa, 0xce], label: "Mach-O executable" },
  // Mach-O executable (macOS) — 64-bit
  { bytes: [0xfe, 0xed, 0xfa, 0xcf], label: "Mach-O executable" },
  // Java class file
  { bytes: [0xca, 0xfe, 0xba, 0xbe], label: "Java class file" },
  // Python bytecode (.pyc)
  { bytes: [0x0d, 0x0a], label: "Python bytecode" },
];

function matchesMagic(buf: Uint8Array, entry: MagicEntry): boolean {
  if (buf.length < entry.bytes.length) return false;
  return entry.bytes.every((b, i) => {
    const mask = entry.mask?.[i] ?? 0xff;
    return (buf[i] & mask) === (b & mask);
  });
}

export type ValidationResult =
  | { ok: true; resolvedMime: string }
  | { ok: false; reason: string };

export function validateUploadMeta(
  fileName: string,
  declaredMime: string,
): ValidationResult {
  // 1. Normalise extension
  const ext = ("." + fileName.split(".").pop()!).toLowerCase();
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return { ok: false, reason: `File type "${ext}" is not permitted.` };
  }

  // 2. Normalise MIME — strip parameters (e.g. "text/plain; charset=utf-8")
  const mime = declaredMime.split(";")[0].trim().toLowerCase();
  if (!MIME_ALLOWLIST.has(mime)) {
    return { ok: false, reason: `MIME type "${mime}" is not permitted.` };
  }

  return { ok: true, resolvedMime: mime };
}

export function validateMagicBytes(buf: Uint8Array): ValidationResult {
  for (const entry of BLOCKED_MAGIC) {
    if (matchesMagic(buf, entry)) {
      return { ok: false, reason: `Upload rejected: ${entry.label} detected.` };
    }
  }
  return { ok: true, resolvedMime: "" };
}
