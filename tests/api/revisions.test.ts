import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { LocalArtifactStorage, verifyArtifactSignature } from "@/server/revisions/artifact-service";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

let tmpDir: string;
let storage: LocalArtifactStorage;

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), "artifact-test-"));
  storage = new LocalArtifactStorage(tmpDir);
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("LocalArtifactStorage — put / get", () => {
  it("stores and retrieves a buffer", async () => {
    const data = Buffer.from("hello world");
    await storage.put("test/file.bin", data, "application/octet-stream");
    const retrieved = await storage.get("test/file.bin");
    expect(retrieved.toString()).toBe("hello world");
  });

  it("returns true for exists() after put", async () => {
    await storage.put("test/exists.bin", Buffer.from("x"), "application/octet-stream");
    expect(await storage.exists("test/exists.bin")).toBe(true);
  });

  it("returns false for exists() before put", async () => {
    expect(await storage.exists("test/nonexistent.bin")).toBe(false);
  });

  it("overwrites on second put (idempotent write)", async () => {
    await storage.put("test/over.bin", Buffer.from("v1"), "application/octet-stream");
    await storage.put("test/over.bin", Buffer.from("v2"), "application/octet-stream");
    const data = await storage.get("test/over.bin");
    expect(data.toString()).toBe("v2");
  });

  it("throws on get for non-existent key", async () => {
    await expect(storage.get("test/missing.bin")).rejects.toThrow();
  });

  it("rejects path traversal key", async () => {
    await expect(
      storage.put("../outside.bin", Buffer.from("x"), "application/octet-stream")
    ).rejects.toThrow();
  });
});

describe("LocalArtifactStorage — signedUrl / verifyArtifactSignature", () => {
  it("generates a signed URL that verifies correctly", async () => {
    process.env.ARTIFACT_SECRET = "test-secret-key-for-tests";
    const url = await storage.signedUrl("test/signed.bin", 60);
    expect(url).toContain("sig=");
    expect(url).toContain("exp=");
    expect(url).toContain("key=test%2Fsigned.bin");

    const urlObj = new URL(url, "http://localhost");
    const sig = urlObj.searchParams.get("sig") ?? "";
    const expStr = urlObj.searchParams.get("exp") ?? "0";
    const key = urlObj.searchParams.get("key") ?? "";
    const valid = verifyArtifactSignature(key, sig, Number(expStr));
    expect(valid).toBe(true);
  });

  it("rejects an expired signed URL", async () => {
    process.env.ARTIFACT_SECRET = "test-secret-key-for-tests";
    const url = await storage.signedUrl("test/expired.bin", -1);
    const urlObj = new URL(url, "http://localhost");
    const sig = urlObj.searchParams.get("sig") ?? "";
    const key = urlObj.searchParams.get("key") ?? "";
    const pastExp = Math.floor(Date.now() / 1000) - 5;
    const valid = verifyArtifactSignature(key, sig, pastExp);
    expect(valid).toBe(false);
  });

  it("rejects a tampered signature", async () => {
    process.env.ARTIFACT_SECRET = "test-secret-key-for-tests";
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const valid = verifyArtifactSignature("test/file.bin", "tampered-sig", exp);
    expect(valid).toBe(false);
  });
});

describe("LocalArtifactStorage — delete", () => {
  it("deletes a file that exists", async () => {
    await storage.put("test/todelete.bin", Buffer.from("bye"), "application/octet-stream");
    await storage.delete("test/todelete.bin");
    expect(await storage.exists("test/todelete.bin")).toBe(false);
  });
});
