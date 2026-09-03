import type { HvacCatalogItem, HvacCategory, QuantityUnit } from "./types";

export type ParsedCatalogRow = {
  rowIndex: number;
  name: string;
  abbreviation: string;
  category: string;
  defaultUnit: string;
  description: string;
  defaultColor: string;
  keywords: string;
  sortOrder: string;
  active: string;
};

export type ImportError = {
  rowIndex: number;
  field: string;
  message: string;
};

export type ValidationResult =
  | { valid: true }
  | { valid: false; errors: ImportError[] };

const VALID_CATEGORIES = new Set<string>([
  "equipment", "air-devices", "ductwork", "duct-fittings",
  "dampers", "controls", "refrigerant-piping", "hydronic-piping",
  "condensate-drains", "insulation", "supports-hangers", "accessories", "other",
]);

const VALID_UNITS = new Set<string>([
  "each", "linear-foot", "linear-inch", "linear-meter",
  "square-foot", "square-meter", "cubic-foot", "cubic-meter",
  "pound", "kilogram", "gallon", "liter", "hour",
]);

const REQUIRED_HEADERS = ["name", "abbreviation", "category", "defaultunit"];

// ─── CSV parser ───────────────────────────────────────────────────────────────
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    i++;
  }
  result.push(current.trim());
  return result;
}

export function parseCatalogCsv(csvText: string): {
  rows: ParsedCatalogRow[];
  errors: ImportError[];
} {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) {
    return { rows: [], errors: [{ rowIndex: 0, field: "header", message: "CSV is empty" }] };
  }

  const headerLine = parseCSVLine(lines[0]);
  const headers = headerLine.map((h) => h.toLowerCase().trim());

  const errors: ImportError[] = [];
  for (const required of REQUIRED_HEADERS) {
    if (!headers.includes(required)) {
      errors.push({ rowIndex: 0, field: required, message: `Missing required header: "${required}"` });
    }
  }
  if (errors.length > 0) return { rows: [], errors };

  const idx = (name: string) => headers.indexOf(name);

  const rows: ParsedCatalogRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    const get = (name: string) => (cells[idx(name)] ?? "").trim();

    rows.push({
      rowIndex: i,
      name: get("name"),
      abbreviation: get("abbreviation"),
      category: get("category"),
      defaultUnit: get("defaultunit") || get("defaultUnit") || get("default_unit") || cells[idx("defaultunit")] || "",
      description: get("description"),
      defaultColor: get("defaultcolor") || get("defaultColor") || "#ff6a1a",
      keywords: get("keywords"),
      sortOrder: get("sortorder") || get("sortOrder") || "0",
      active: get("active") || "true",
    });
  }

  return { rows, errors: [] };
}

// ─── Row validator ────────────────────────────────────────────────────────────
export function validateCatalogRow(
  row: ParsedCatalogRow,
  existing: HvacCatalogItem[]
): ValidationResult {
  const errors: ImportError[] = [];
  const ri = row.rowIndex;

  if (!row.name || row.name.length > 200) {
    errors.push({ rowIndex: ri, field: "name", message: "name is required (max 200 chars)" });
  }
  if (!row.abbreviation || row.abbreviation.length > 20) {
    errors.push({ rowIndex: ri, field: "abbreviation", message: "abbreviation is required (max 20 chars)" });
  }
  if (!VALID_CATEGORIES.has(row.category)) {
    errors.push({ rowIndex: ri, field: "category", message: `Invalid category: "${row.category}"` });
  }
  if (!VALID_UNITS.has(row.defaultUnit)) {
    errors.push({ rowIndex: ri, field: "defaultUnit", message: `Invalid unit: "${row.defaultUnit}"` });
  }
  // Duplicate name check
  const dup = existing.find((e) => e.name.toLowerCase() === row.name.toLowerCase());
  if (dup) {
    errors.push({ rowIndex: ri, field: "name", message: `Duplicate name: "${row.name}" already exists` });
  }

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true };
}

// ─── Convert validated row to partial catalog input ────────────────────────────
export function catalogRowToInput(
  row: ParsedCatalogRow,
  organizationId: string,
  authorName: string
): Omit<HvacCatalogItem, "id" | "revision" | "createdAt" | "updatedAt"> {
  const keywords = row.keywords
    ? row.keywords.split(";").map((k) => k.trim()).filter(Boolean)
    : [];

  return {
    organizationId,
    category: row.category as HvacCategory,
    name: row.name,
    abbreviation: row.abbreviation,
    description: row.description || null,
    active: row.active.toLowerCase() !== "false",
    defaultUnit: row.defaultUnit as QuantityUnit,
    defaultColor: row.defaultColor || "#ff6a1a",
    defaultSymbol: null,
    keywords,
    sortOrder: parseInt(row.sortOrder, 10) || 0,
    createdBy: { name: authorName },
  };
}
