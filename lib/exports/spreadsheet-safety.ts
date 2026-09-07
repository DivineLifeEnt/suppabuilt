/**
 * Formula injection protection for spreadsheet exports.
 * Reuses and extends escapeCsvField from lib/takeoff/csv-export.ts.
 */
export { escapeCsvField } from "@/lib/takeoff/csv-export";

/**
 * Escape a cell value for XLSX export.
 * - Numbers: pass through as numbers (xlsx will type them correctly)
 * - Booleans: pass through as booleans
 * - Strings: prefix with ' if starts with =, +, -, @, tab, carriage-return
 * - null/undefined: empty string
 * - Other: convert to string safely
 */
export function escapeCellValue(value: unknown): string | number | boolean {
  if (typeof value === "number" && isFinite(value)) return value;
  if (typeof value === "boolean") return value;
  if (value == null) return "";
  const s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) {
    return `'${s}`;
  }
  return s;
}
