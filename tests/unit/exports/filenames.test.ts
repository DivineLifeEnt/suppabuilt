import { describe, it, expect } from "vitest";
import { exportFilename } from "@/lib/exports/filenames";
import type { ExportType } from "@/lib/estimating/types";

// exportFilename signature: (type: ExportType, projectName: string, timestamp: Date): string

describe("exportFilename", () => {
  it("produces correct format with estimate-internal-xlsx", () => {
    const name = exportFilename("estimate-internal-xlsx", "My Project", new Date("2024-01-15T00:00:00Z"));
    expect(name).toMatch(/suppabuilt/);
    expect(name).toMatch(/my-project/);
    expect(name).toMatch(/2024-01-15/);
    expect(name).toMatch(/\.xlsx$/);
  });

  it("is deterministic for same inputs", () => {
    const d = new Date("2024-06-01T00:00:00Z");
    const a = exportFilename("takeoff-csv" as ExportType, "Test Project", d);
    const b = exportFilename("takeoff-csv" as ExportType, "Test Project", d);
    expect(a).toBe(b);
  });

  it("respects 100 char limit", () => {
    const long = "x".repeat(100);
    const name = exportFilename("estimate-customer-pdf" as ExportType, long, new Date("2024-01-01T00:00:00Z"));
    expect(name.length).toBeLessThanOrEqual(100);
  });

  it("uses correct extension for xlsx", () => {
    const name = exportFilename("takeoff-xlsx" as ExportType, "P", new Date("2024-01-01T00:00:00Z"));
    expect(name).toMatch(/\.xlsx$/);
  });

  it("uses correct extension for csv", () => {
    const name = exportFilename("takeoff-csv" as ExportType, "P", new Date("2024-01-01T00:00:00Z"));
    expect(name).toMatch(/\.csv$/);
  });

  it("uses correct extension for pdf", () => {
    const name = exportFilename("estimate-customer-pdf" as ExportType, "P", new Date("2024-01-01T00:00:00Z"));
    expect(name).toMatch(/\.pdf$/);
  });

  it("handles special characters in project name", () => {
    const name = exportFilename("estimate-internal-xlsx", "Project #1 (Test)", new Date("2024-01-01T00:00:00Z"));
    expect(name).not.toContain("#");
    expect(name).not.toContain("(");
    expect(name).toMatch(/project/);
  });
});
