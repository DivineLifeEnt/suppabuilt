import type { ExportType } from "@/lib/estimating/types";

const TYPE_SUFFIX: Record<ExportType, string> = {
  "flattened-plan-pdf": "flattened-plan.pdf",
  "markup-report-pdf": "markup-report.pdf",
  "markup-report-csv": "markup-report.csv",
  "markup-report-xlsx": "markup-report.xlsx",
  "measurement-report-pdf": "measurement-report.pdf",
  "measurement-report-csv": "measurement-report.csv",
  "measurement-report-xlsx": "measurement-report.xlsx",
  "takeoff-csv": "takeoff.csv",
  "takeoff-xlsx": "takeoff.xlsx",
  "estimate-internal-xlsx": "estimate-internal.xlsx",
  "estimate-customer-pdf": "estimate-customer.pdf",
  "estimate-detail-pdf": "estimate-detail.pdf",
  "estimate-csv": "estimate.csv",
  "estimate-comparison-report": "estimate-comparison.pdf",
};

/**
 * Sanitize a string for use in a filename:
 * - Replace non-alphanumeric chars (except hyphens) with hyphens
 * - Collapse consecutive hyphens
 * - Trim leading/trailing hyphens
 * - Lowercase
 * - Truncate to maxLen
 */
function sanitizeSegment(s: string, maxLen = 60): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLen);
}

/**
 * Format a date as YYYY-MM-DD
 */
function formatDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Generate a safe export filename.
 * "suppabuilt-{type-slug}-{project-slug}-{date}.{ext}"
 * Total length: ≤ 100 chars.
 */
export function exportFilename(
  type: ExportType,
  projectName: string,
  timestamp: Date
): string {
  const suffix = TYPE_SUFFIX[type];
  const dateStr = formatDate(timestamp);
  const base = `suppabuilt-${sanitizeSegment(suffix.replace(/\.[^.]+$/, ""))}-${dateStr}`;
  const projectSlug = sanitizeSegment(projectName, 40);
  const full = `suppabuilt-${projectSlug}-${sanitizeSegment(suffix.replace(/\.[^.]+$/, ""))}-${dateStr}${suffix.match(/\.[^.]+$/)![0]}`;
  if (full.length <= 100) return full;
  // Truncate project name to fit
  const ext = suffix.match(/\.[^.]+$/)![0];
  const fixedPart = `suppabuilt--${sanitizeSegment(suffix.replace(/\.[^.]+$/, ""))}-${dateStr}${ext}`;
  const remaining = 100 - fixedPart.length;
  const truncatedProject = sanitizeSegment(projectName, Math.max(1, remaining));
  return `suppabuilt-${truncatedProject}-${sanitizeSegment(suffix.replace(/\.[^.]+$/, ""))}-${dateStr}${ext}`;
  void base;
}
