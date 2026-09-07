import { mkdir, readFile, writeFile, access, unlink } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { createHmac } from "node:crypto";
import { validateArtifactKey } from "@/lib/revisions/artifact-keys";

// ─── Interface ────────────────────────────────────────────────────────────────

export interface ArtifactStorage {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  exists(key: string): Promise<boolean>;
  signedUrl(key: string, expiresInSeconds: number): Promise<string>;
  delete(key: string): Promise<void>;
}

// ─── Local implementation ─────────────────────────────────────────────────────

function getStorageRoot(): string {
  return path.join(process.cwd(), "storage", "artifacts");
}

function keyToPath(storageRoot: string, key: string): string {
  validateArtifactKey(key);
  // key uses forward slashes; path.join handles platform differences
  return path.join(storageRoot, ...key.split("/"));
}

export class LocalArtifactStorage implements ArtifactStorage {
  private readonly storageRoot: string;

  constructor(storageRoot?: string) {
    this.storageRoot = storageRoot ?? getStorageRoot();
  }

  async put(key: string, data: Buffer, _contentType: string): Promise<void> {
    const filePath = keyToPath(this.storageRoot, key);
    await mkdir(path.dirname(filePath), { recursive: true });
    const tmp = `${filePath}.tmp-${Date.now()}`;
    await writeFile(tmp, data);
    // Atomic rename
    const { rename } = await import("node:fs/promises");
    await rename(tmp, filePath);
  }

  async get(key: string): Promise<Buffer> {
    const filePath = keyToPath(this.storageRoot, key);
    const data = await readFile(filePath);
    return Buffer.from(data);
  }

  async exists(key: string): Promise<boolean> {
    const filePath = keyToPath(this.storageRoot, key);
    try {
      await access(filePath, fsConstants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async signedUrl(key: string, expiresInSeconds: number): Promise<string> {
    validateArtifactKey(key);
    const secret = process.env.ARTIFACT_SECRET ?? "dev-secret-change-me";
    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const payload = `${key}:${exp}`;
    const sig = createHmac("sha256", secret).update(payload).digest("hex");
    return `/api/artifacts?key=${encodeURIComponent(key)}&sig=${sig}&exp=${exp}`;
  }

  async delete(key: string): Promise<void> {
    const filePath = keyToPath(this.storageRoot, key);
    try {
      await unlink(filePath);
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code !== "ENOENT") throw err;
    }
  }
}

// ─── HMAC verification (used in API route) ────────────────────────────────────

export function verifyArtifactSignature(
  key: string,
  sig: string,
  exp: number
): boolean {
  if (Date.now() / 1000 > exp) return false;
  const secret = process.env.ARTIFACT_SECRET ?? "dev-secret-change-me";
  const payload = `${key}:${exp}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  // Constant-time compare
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return diff === 0;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

let _storage: ArtifactStorage | null = null;

export function getArtifactStorage(): ArtifactStorage {
  if (_storage) return _storage;
  // Only local provider supported; extend here for S3/GCS
  _storage = new LocalArtifactStorage();
  return _storage;
}

export function resetArtifactStorage(): void {
  _storage = null;
}
