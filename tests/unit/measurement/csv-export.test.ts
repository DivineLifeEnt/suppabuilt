import { describe, it, expect } from "vitest";
import { measurementsToCsv } from "@/lib/measurement/csv-export";
import type { Measurement, Calibration, MeasurementGroup } from "@/lib/measurement/types";
import type { NormalizedPoint } from "@/lib/markup/types";

const pt = (x: number, y: number): NormalizedPoint => ({ x, y });

const STYLE = {
  stroke: "#F59E0B",
  strokeWidth: 2,
  fill: "#F59E0B22" as const,
  opacity: 1,
  fontSize: 12,
  labelPosition: "auto" as const,
};

const baseFields = {
  planId: "p1",
  pageNumber: 1,
  calibrationId: null,
  label: null,
  prefix: null,
  suffix: null,
  style: STYLE,
  locked: false,
  visible: true,
  status: "open" as const,
  groupId: null,
  zIndex: 0,
  revision: 1,
  createdBy: { name: "Test" },
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const linearM: Measurement = {
  ...baseFields,
  id: "m-001",
  type: "linear",
  start: pt(0, 0),
  end: pt(0.5, 0),
  displayUnit: "foot",
  precision: 2,
};

const countMFormula: Measurement = {
  ...baseFields,
  id: "m-002",
  type: "count",
  points: [pt(0.1, 0.1), pt(0.2, 0.2)],
  label: "=DANGER_FORMULA",
};

const emptyCals: Map<string, Calibration> = new Map();
const emptyGroups: Map<string, MeasurementGroup> = new Map();

describe("measurementsToCsv", () => {
  it("produces a header row with expected columns", () => {
    const csv = measurementsToCsv([linearM], emptyCals, emptyGroups);
    const header = csv.split("\n")[0];
    expect(header).toContain("ID");
    expect(header).toContain("Type");
    expect(header).toContain("Quantity");
    expect(header).toContain("Page");
  });

  it("produces one data row per measurement", () => {
    const csv = measurementsToCsv([linearM, countMFormula], emptyCals, emptyGroups);
    const lines = csv.split("\n").filter((l) => l.trim() !== "");
    expect(lines).toHaveLength(3); // header + 2 rows
  });

  it("escapes formula injection prefix '=' in label", () => {
    const csv = measurementsToCsv([countMFormula], emptyCals, emptyGroups);
    // "=DANGER_FORMULA" must not appear verbatim — should have leading '
    expect(csv).not.toMatch(/,=DANGER_FORMULA[,\n]/);
    // But the content should still be present
    expect(csv).toContain("DANGER_FORMULA");
  });

  it("escapes '+' prefix injection", () => {
    const m: Measurement = {
      ...baseFields,
      id: "m-003",
      type: "count",
      points: [pt(0.1, 0.1)],
      label: "+SUM(A1:A10)",
    };
    const csv = measurementsToCsv([m], emptyCals, emptyGroups);
    // Should not start with '+'
    expect(csv).not.toMatch(/,\+SUM\(A1:A10\)[,\n]/);
  });

  it("sorts deterministically by page, zIndex, id", () => {
    const m1: Measurement = { ...baseFields, id: "b", type: "count", points: [], zIndex: 2 };
    const m2: Measurement = { ...baseFields, id: "a", type: "count", points: [], zIndex: 1 };
    // m2 (zIndex 1) should come before m1 (zIndex 2) in sorted output
    const csv1 = measurementsToCsv([m1, m2], emptyCals, emptyGroups);
    const csv2 = measurementsToCsv([m2, m1], emptyCals, emptyGroups);
    expect(csv1).toBe(csv2);
    // Verify ordering: 'a' (zIndex 1) is first data row
    const dataRows = csv1.split("\n").slice(1).filter((l) => l.trim() !== "");
    expect(dataRows[0]).toContain("a");
    expect(dataRows[1]).toContain("b");
  });

  it("handles empty measurement list — only header", () => {
    const csv = measurementsToCsv([], emptyCals, emptyGroups);
    const lines = csv.split("\n").filter((l) => l.trim() !== "");
    expect(lines).toHaveLength(1);
  });

  it("writes correct type column", () => {
    const csv = measurementsToCsv([linearM], emptyCals, emptyGroups);
    expect(csv).toContain("linear");
  });

  it("includes group name when group is provided", () => {
    const group: MeasurementGroup = {
      id: "g1",
      planId: "p1",
      name: "Ductwork",
      color: "#ff0000",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const mWithGroup: Measurement = { ...linearM, id: "m-grp", groupId: "g1" };
    const groupMap = new Map([["g1", group]]);
    const csv = measurementsToCsv([mWithGroup], emptyCals, groupMap);
    expect(csv).toContain("Ductwork");
  });
});
