import { describe, it, expect } from "vitest";
import {
  CreateCatalogItemSchema,
  UpdateCatalogItemSchema,
  CreateAssemblySchema,
  CreateTakeoffItemSchema,
  BatchTakeoffSchema,
  AssemblyRuleSchema,
} from "@/lib/takeoff/schemas";

describe("AssemblyRuleSchema", () => {
  it("parses fixed rule", () => {
    const r = AssemblyRuleSchema.parse({ kind: "fixed", quantity: "3" });
    expect(r.kind).toBe("fixed");
  });
  it("parses conditional rule", () => {
    const r = AssemblyRuleSchema.parse({ kind: "conditional", field: "material", equals: "copper", thenQuantity: "5", elseQuantity: "2" });
    expect(r.kind).toBe("conditional");
  });
  it("rejects unknown kind", () => {
    expect(() => AssemblyRuleSchema.parse({ kind: "unknown" })).toThrow();
  });
});

describe("CreateCatalogItemSchema", () => {
  const base = {
    organizationId: "org1", category: "equipment", name: "AHU-1",
    abbreviation: "AHU", description: null, active: true, defaultUnit: "each",
    createdBy: { name: "Test" },
  };
  it("accepts valid input", () => {
    expect(() => CreateCatalogItemSchema.parse(base)).not.toThrow();
  });
  it("rejects empty name", () => {
    expect(() => CreateCatalogItemSchema.parse({ ...base, name: "" })).toThrow();
  });
  it("rejects invalid category", () => {
    expect(() => CreateCatalogItemSchema.parse({ ...base, category: "bad-cat" })).toThrow();
  });
});

describe("CreateTakeoffItemSchema", () => {
  const base = {
    planId: "plan1", catalogItemId: "cat1",
    source: { kind: "manual" }, unit: "each",
    netQuantity: "1", createdBy: { name: "Test" },
  };
  it("accepts valid input", () => {
    expect(() => CreateTakeoffItemSchema.parse(base)).not.toThrow();
  });
  it("rejects invalid source kind", () => {
    expect(() => CreateTakeoffItemSchema.parse({ ...base, source: { kind: "invalid" } })).toThrow();
  });
});

describe("BatchTakeoffSchema", () => {
  it("accepts batch with create op", () => {
    const batch = {
      items: [{
        op: "create",
        input: {
          planId: "p1", catalogItemId: "c1",
          source: { kind: "manual" }, unit: "each",
          netQuantity: "1", createdBy: { name: "T" },
        },
      }],
    };
    expect(() => BatchTakeoffSchema.parse(batch)).not.toThrow();
  });
  it("rejects batch over 250", () => {
    const batch = { items: Array.from({ length: 251 }, (_, i) => ({
      op: "delete", id: `id${i}`, expectedRevision: 1,
    })) };
    expect(() => BatchTakeoffSchema.parse(batch)).toThrow();
  });
});
