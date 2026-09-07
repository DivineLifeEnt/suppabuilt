import { describe, it, expect } from "vitest";
import {
  pdfKey,
  renderKey,
  thumbnailKey,
  diffMaskKey,
  diffOverlayKey,
  validateArtifactKey,
} from "@/lib/revisions/artifact-keys";

describe("key generators", () => {
  it("pdfKey includes all segments", () => {
    const key = pdfKey("org-1", "proj-1", "set-1", "ver-1", "abc123");
    expect(key).toContain("org-1");
    expect(key).toContain("proj-1");
    expect(key).toContain("set-1");
    expect(key).toContain("ver-1");
    expect(key).toContain("abc123");
    expect(key).toMatch(/\.pdf$/);
  });

  it("renderKey includes page version id and dpi", () => {
    const key = renderKey("org-1", "pv-1", 150, "checksum123");
    expect(key).toContain("pv-1");
    expect(key).toContain("150dpi");
    expect(key).toContain("checksum123");
  });

  it("thumbnailKey includes page version id", () => {
    const key = thumbnailKey("org-1", "pv-1", "thumb-checksum");
    expect(key).toContain("pv-1");
    expect(key).toContain("thumb-checksum");
  });

  it("diffMaskKey includes comparison id", () => {
    const key = diffMaskKey("cmp-1", "v1");
    expect(key).toContain("cmp-1");
    expect(key).toMatch(/\.png$/);
  });

  it("diffOverlayKey includes comparison id", () => {
    const key = diffOverlayKey("cmp-1", "v1");
    expect(key).toContain("cmp-1");
    expect(key).toMatch(/\.png$/);
  });
});

describe("validateArtifactKey", () => {
  it("does not throw for a valid key", () => {
    expect(() => validateArtifactKey("versions/v1/renders/page-0.png")).not.toThrow();
  });

  it("throws for path traversal (..)", () => {
    expect(() => validateArtifactKey("versions/../secret.pdf")).toThrow();
  });

  it("throws for leading slash", () => {
    expect(() => validateArtifactKey("/versions/v1/file.pdf")).toThrow();
  });

  it("throws for spaces", () => {
    expect(() => validateArtifactKey("versions/v 1/file.pdf")).toThrow();
  });

  it("throws for empty string", () => {
    expect(() => validateArtifactKey("")).toThrow();
  });
});
