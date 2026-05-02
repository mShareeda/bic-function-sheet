import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";

export interface Storage {
  getUploadDestination(key: string, contentType: string): Promise<{ uploadUrl: string; storageKey: string }>;
  getDownloadUrl(key: string): Promise<string>;
  delete(key: string): Promise<void>;
}

function buildKey(folder: string, fileName: string): string {
  const id = randomUUID();
  const slug = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  return `${folder}/${id}-${slug}`;
}

export function newStorageKey(folder: string, fileName: string) {
  return buildKey(folder, fileName);
}

// =====================
// Local disk (dev)
// =====================
class LocalDiskStorage implements Storage {
  private baseDir: string;
  private baseUrl: string;

  constructor(baseDir: string, baseUrl: string) {
    this.baseDir = baseDir;
    this.baseUrl = baseUrl;
  }

  /** Resolve and validate that `key` stays within baseDir (prevents path traversal). */
  private safeResolve(key: string): string {
    const base = path.resolve(this.baseDir);
    const resolved = path.resolve(path.join(this.baseDir, key));
    if (!resolved.startsWith(base + path.sep) && resolved !== base) {
      throw new Error("Invalid storage key: path escapes storage directory");
    }
    return resolved;
  }

  async getUploadDestination(key: string) {
    // For local storage, upload goes through a proxy route
    return {
      uploadUrl: `/api/attachments/upload?key=${encodeURIComponent(key)}`,
      storageKey: key,
    };
  }

  async getDownloadUrl(key: string) {
    return `${this.baseUrl}/api/attachments/${encodeURIComponent(key)}`;
  }

  async delete(key: string) {
    const filePath = this.safeResolve(key);
    await fs.unlink(filePath).catch(() => {});
  }

  async writeFile(key: string, data: Buffer) {
    const filePath = this.safeResolve(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
  }

  async readFile(key: string): Promise<Buffer> {
    const filePath = this.safeResolve(key);
    return fs.readFile(filePath);
  }
}

// =====================
// Azure Blob (prod)
// =====================
class AzureBlobStorage implements Storage {
  async getUploadDestination(key: string, contentType: string) {
    const { BlobServiceClient, BlobSASPermissions, generateBlobSASQueryParameters, StorageSharedKeyCredential } =
      await import("@azure/storage-blob");

    const account = process.env.AZURE_STORAGE_ACCOUNT!;
    const accountKey = process.env.AZURE_STORAGE_KEY!;
    const container = process.env.AZURE_STORAGE_CONTAINER!;

    const cred = new StorageSharedKeyCredential(account, accountKey);
    const client = new BlobServiceClient(`https://${account}.blob.core.windows.net`, cred);
    const containerClient = client.getContainerClient(container);

    const startsOn = new Date();
    const expiresOn = new Date(startsOn.getTime() + 15 * 60 * 1000);

    const sas = generateBlobSASQueryParameters(
      {
        containerName: container,
        blobName: key,
        permissions: BlobSASPermissions.parse("cw"),
        startsOn,
        expiresOn,
        contentType,
      },
      cred,
    ).toString();

    const uploadUrl = `https://${account}.blob.core.windows.net/${container}/${key}?${sas}`;
    return { uploadUrl, storageKey: key };
  }

  async getDownloadUrl(key: string) {
    const { BlobServiceClient, BlobSASPermissions, generateBlobSASQueryParameters, StorageSharedKeyCredential } =
      await import("@azure/storage-blob");

    const account = process.env.AZURE_STORAGE_ACCOUNT!;
    const accountKey = process.env.AZURE_STORAGE_KEY!;
    const container = process.env.AZURE_STORAGE_CONTAINER!;

    const cred = new StorageSharedKeyCredential(account, accountKey);
    const expiresOn = new Date(Date.now() + 60 * 60 * 1000);

    const sas = generateBlobSASQueryParameters(
      {
        containerName: container,
        blobName: key,
        permissions: BlobSASPermissions.parse("r"),
        expiresOn,
      },
      cred,
    ).toString();

    return `https://${account}.blob.core.windows.net/${container}/${key}?${sas}`;
  }

  async delete(key: string) {
    const { BlobServiceClient, StorageSharedKeyCredential } = await import("@azure/storage-blob");
    const account = process.env.AZURE_STORAGE_ACCOUNT!;
    const accountKey = process.env.AZURE_STORAGE_KEY!;
    const container = process.env.AZURE_STORAGE_CONTAINER!;
    const cred = new StorageSharedKeyCredential(account, accountKey);
    const client = new BlobServiceClient(`https://${account}.blob.core.windows.net`, cred);
    await client.getContainerClient(container).deleteBlob(key).catch(() => {});
  }
}

let _storage: Storage | undefined;
export function getStorage(): Storage {
  if (_storage) return _storage;
  const driver = process.env.STORAGE_DRIVER ?? "local";
  if (driver === "azure") {
    _storage = new AzureBlobStorage();
  } else {
    const baseDir = process.env.STORAGE_LOCAL_DIR ?? "./storage";
    const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
    _storage = new LocalDiskStorage(baseDir, baseUrl);
  }
  return _storage;
}

export { LocalDiskStorage };
