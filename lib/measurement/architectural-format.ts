import type { ArchitecturalDenominator } from "./types";

// ─── GCD ──────────────────────────────────────────────────────────────────────
export function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b > 0) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a || 1;
}

// ─── Round to nearest fraction ────────────────────────────────────────────────
/**
 * Round `inches` to the nearest 1/denominator inch.
 * e.g. 5.37 with denom 8 → 5.375 (nearest 1/8 = 3/8)
 */
export function roundToFraction(
  inches: number,
  denominator: ArchitecturalDenominator
): number {
  return Math.round(inches * denominator) / denominator;
}

// ─── Format fractional inches ─────────────────────────────────────────────────
/**
 * Format the sub-inch fractional part.
 * e.g. 0.5 with denom 8 → "1/2" (reduced from 4/8)
 * Returns "" if the fractional part is effectively zero.
 */
export function formatFractionalInches(
  inches: number,
  denominator: ArchitecturalDenominator
): string {
  // Work with the fractional part only (inches might already be fractional)
  const rounded = roundToFraction(inches, denominator);
  const wholeInches = Math.floor(rounded);
  const fracPart = rounded - wholeInches;

  if (fracPart < 1 / (denominator * 2)) return ""; // effectively zero

  const numerator = Math.round(fracPart * denominator);
  const g = gcd(numerator, denominator);
  return `${numerator / g}/${denominator / g}`;
}

// ─── Format architectural ─────────────────────────────────────────────────────
/**
 * Format a value in feet to the standard architectural string.
 * e.g. 3.375 ft with denom 8 → "3'-4 1/2\""
 * e.g. 0.0625 ft with denom 16 → "3/4\""
 * e.g. 0 ft → "0\""
 */
export function formatArchitectural(
  feet: number,
  denominator: ArchitecturalDenominator
): string {
  if (!isFinite(feet) || isNaN(feet)) return "—";

  const negative = feet < 0;
  const absFeet = Math.abs(feet);

  // Total inches rounded to nearest fraction
  const totalInches = roundToFraction(absFeet * 12, denominator);

  const wholeFeet = Math.floor(totalInches / 12);
  const remainingInches = totalInches - wholeFeet * 12;
  const wholeInches = Math.floor(remainingInches);
  const fracInches = remainingInches - wholeInches;

  const fracStr = fracInches > 0
    ? formatFractionalInches(fracInches, denominator)
    : "";

  const sign = negative ? "-" : "";

  if (wholeFeet === 0) {
    // No feet portion
    const inchStr = fracStr
      ? wholeInches > 0
        ? `${wholeInches} ${fracStr}"`
        : `${fracStr}"`
      : `${wholeInches}"`;
    return `${sign}${inchStr}`;
  }

  // Has feet
  const inchPart = fracStr
    ? wholeInches > 0
      ? `${wholeInches} ${fracStr}"`
      : `${fracStr}"`
    : `${wholeInches}"`;

  return `${sign}${wholeFeet}'-${inchPart}`;
}
