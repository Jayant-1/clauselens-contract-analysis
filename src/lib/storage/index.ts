import fs from "fs/promises";
import path from "path";

export interface StorageProvider {
  save(key: string, buffer: Buffer, contentType: string): Promise<string>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
}

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor(baseDir?: string) {
    if (baseDir) {
      this.baseDir = baseDir;
    } else if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      this.baseDir = path.join("/tmp", "uploads");
    } else {
      this.baseDir = path.join(process.cwd(), "uploads");
    }
  }

  private async ensureDir(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch {
      // directory already exists or error
    }
  }

  async save(key: string, buffer: Buffer, _contentType: string): Promise<string> {
    await this.ensureDir();
    // Sanitize key to prevent path traversal
    const safeKey = path.basename(key);
    const fullPath = path.join(this.baseDir, safeKey);
    await fs.writeFile(fullPath, buffer);
    return safeKey;
  }

  async get(key: string): Promise<Buffer> {
    const safeKey = path.basename(key);
    const fullPath = path.join(this.baseDir, safeKey);
    return await fs.readFile(fullPath);
  }

  async delete(key: string): Promise<void> {
    try {
      const safeKey = path.basename(key);
      const fullPath = path.join(this.baseDir, safeKey);
      await fs.unlink(fullPath);
    } catch (err: unknown) {
      const error = err as NodeJS.ErrnoException;
      if (error.code !== "ENOENT") {
        throw err;
      }
    }
  }

  getUrl(key: string): string {
    const safeKey = path.basename(key);
    return `/api/documents/file/${encodeURIComponent(safeKey)}`;
  }
}

/**
 * S3 Storage Provider stub ready for production AWS S3 integration
 */
export class S3StorageProvider implements StorageProvider {
  private bucket: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET || "contract-uploads";
  }

  async save(key: string, _buffer: Buffer, _contentType: string): Promise<string> {
    // In production with AWS SDK:
    // await s3.putObject({ Bucket: this.bucket, Key: key, Body: buffer, ContentType: contentType }).promise();
    return key;
  }

  async get(_key: string): Promise<Buffer> {
    throw new Error("S3StorageProvider: get() requires AWS SDK credentials in production.");
  }

  async delete(_key: string): Promise<void> {
    // await s3.deleteObject({ Bucket: this.bucket, Key: key }).promise();
  }

  getUrl(key: string): string {
    return `https://${this.bucket}.s3.amazonaws.com/${encodeURIComponent(key)}`;
  }
}

/**
 * Vercel Blob Storage Provider stub ready for production Vercel Blob integration
 */
export class VercelBlobStorageProvider implements StorageProvider {
  async save(key: string, _buffer: Buffer, _contentType: string): Promise<string> {
    // In production with @vercel/blob:
    // const blob = await put(key, buffer, { access: 'public', contentType });
    // return blob.url;
    return key;
  }

  async get(_key: string): Promise<Buffer> {
    throw new Error("VercelBlobStorageProvider: get() requires BLOB_READ_WRITE_TOKEN in production.");
  }

  async delete(_key: string): Promise<void> {
    // await del(key);
  }

  getUrl(key: string): string {
    return key.startsWith("http") ? key : `/api/documents/file/${encodeURIComponent(key)}`;
  }
}

export function getStorageProvider(): StorageProvider {
  const providerType = process.env.STORAGE_PROVIDER || "local";
  switch (providerType) {
    case "s3":
      return new S3StorageProvider();
    case "vercel_blob":
      return new VercelBlobStorageProvider();
    case "local":
    default:
      return new LocalStorageProvider();
  }
}

export const storage = getStorageProvider();
