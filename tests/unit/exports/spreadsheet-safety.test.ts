import { describe, it, expect } from "vitest";
import { escapeCellValue } from "@/lib/exports/spreadsheet-safety";

describe("escapeCellValue — formula injection protection", () => {
  it("prefixes = with apostrophe", () => {
    expect(escapeCellValue("=SUM(A1)")).toBe("'=SUM(A1)");
  });

  it("prefixes + with apostrophe", () => {
    expect(escapeCellValue("+cmd")).toBe("'+cmd");
  });

  it("prefixes - with apostrophe", () => {
    expect(escapeCellValue("-1+1")).toBe("'-1+1");
  });

  it("prefixes @ with apostrophe", () => {
    expect(escapeCellValue("@A1")).toBe("'@A1");
  });

  it("prefixes tab with apostrophe", () => {
    expect(escapeCellValue("\tSHEET")).toBe("'\tSHEET");
  });

  it("does not modify safe strings", () => {
    expect(escapeCellValue("hello world")).toBe("hello world");
    expect(escapeCellValue("100 Main St")).toBe("100 Main St");
  });

  it("passes through numbers unchanged", () => {
    expect(escapeCellValue(42)).toBe(42);
    expect(escapeCellValue(0)).toBe(0);
    expect(escapeCellValue(-1)).toBe(-1);
  });

  it("passes through booleans unchanged", () => {
    expect(escapeCellValue(true)).toBe(true);
    expect(escapeCellValue(false)).toBe(false);
  });

  it("converts null and undefined to empty string (xlsx-safe)", () => {
    // The function returns "" for null/undefined so xlsx doesn't get undefined
    expect(escapeCellValue(null)).toBe("");
    expect(escapeCellValue(undefined)).toBe("");
  });
});
