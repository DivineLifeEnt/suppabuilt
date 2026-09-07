import { describe, it, expect } from "vitest";
import {
  hasPermission,
  getEffectiveProjectRole,
  type ProjectRole,
  type Permission,
} from "@/lib/collaboration/permissions";

const ALL_PERMISSIONS: Permission[] = [
  "view", "markup:write", "measurement:write", "takeoff:write",
  "comment:write", "comment:resolve-any", "session:manage", "project:manage",
];

describe("hasPermission — project-admin", () => {
  it("has all permissions", () => {
    for (const p of ALL_PERMISSIONS) {
      expect(hasPermission("project-admin", p), p).toBe(true);
    }
  });
});

describe("hasPermission — editor", () => {
  it("has view + write permissions", () => {
    expect(hasPermission("editor", "view")).toBe(true);
    expect(hasPermission("editor", "markup:write")).toBe(true);
    expect(hasPermission("editor", "measurement:write")).toBe(true);
    expect(hasPermission("editor", "takeoff:write")).toBe(true);
    expect(hasPermission("editor", "comment:write")).toBe(true);
  });
  it("lacks admin permissions", () => {
    expect(hasPermission("editor", "comment:resolve-any")).toBe(false);
    expect(hasPermission("editor", "session:manage")).toBe(false);
    expect(hasPermission("editor", "project:manage")).toBe(false);
  });
});

describe("hasPermission — commenter", () => {
  it("has view + comment:write only", () => {
    expect(hasPermission("commenter", "view")).toBe(true);
    expect(hasPermission("commenter", "comment:write")).toBe(true);
  });
  it("lacks write permissions", () => {
    expect(hasPermission("commenter", "markup:write")).toBe(false);
    expect(hasPermission("commenter", "measurement:write")).toBe(false);
    expect(hasPermission("commenter", "takeoff:write")).toBe(false);
    expect(hasPermission("commenter", "session:manage")).toBe(false);
  });
});

describe("hasPermission — viewer", () => {
  it("has only view", () => {
    expect(hasPermission("viewer", "view")).toBe(true);
  });
  it("lacks all write permissions", () => {
    const noView = ALL_PERMISSIONS.filter((p) => p !== "view");
    for (const p of noView) {
      expect(hasPermission("viewer", p), p).toBe(false);
    }
  });
});

describe("getEffectiveProjectRole — org owner/admin inheritance", () => {
  const cases: Array<[Parameters<typeof getEffectiveProjectRole>[0], ProjectRole | null, ProjectRole]> = [
    ["owner", null, "editor"],
    ["owner", "viewer", "editor"],
    ["owner", "commenter", "editor"],
    ["owner", "editor", "editor"],
    ["owner", "project-admin", "project-admin"],
    ["admin", null, "editor"],
    ["admin", "viewer", "editor"],
    ["member", null, "viewer"],
    ["member", "commenter", "commenter"],
    ["member", "editor", "editor"],
  ];
  for (const [orgRole, projRole, expected] of cases) {
    it(`org:${orgRole} proj:${projRole ?? "null"} → ${expected}`, () => {
      expect(getEffectiveProjectRole(orgRole, projRole)).toBe(expected);
    });
  }
});

describe("cross-tenant denial", () => {
  it("viewer has no write access", () => {
    expect(hasPermission("viewer", "markup:write")).toBe(false);
  });
});
