// ─── Decimal-safe arithmetic via scaled-integer (10 decimal places precision) ──
// NO floating-point accumulation. All quantities stored as decimal strings.

const SCALE = 10n;      // decimal places
const FACTOR = 10n ** SCALE; // 10^10

/** Parse a decimal string like "3.14159" → bigint scaled by FACTOR */
export function parseDecimal(s: string): bigint {
  if (typeof s !== "string" || s.trim() === "") throw new Error(`Invalid decimal: "${s}"`);
  const trimmed = s.trim();
  const negative = trimmed.startsWith("-");
  const abs = negative ? trimmed.slice(1) : trimmed;
  const dot = abs.indexOf(".");
  if (dot === -1) {
    return (negative ? -1n : 1n) * BigInt(abs) * FACTOR;
  }
  const intPart = abs.slice(0, dot) || "0";
  const fracRaw = abs.slice(dot + 1);
  // Pad or truncate to exactly SCALE digits
  const frac = fracRaw.padEnd(Number(SCALE), "0").slice(0, Number(SCALE));
  const result = BigInt(intPart) * FACTOR + BigInt(frac);
  return negative ? -result : result;
}

/** Format scaled bigint back to a decimal string with given decimal places */
export function formatDecimal(n: bigint, decimalPlaces = 6): string {
  const negative = n < 0n;
  const abs = negative ? -n : n;
  const intPart = abs / FACTOR;
  const fracPart = abs % FACTOR;
  // fracPart has SCALE digits; format to decimalPlaces
  const fracStr = fracPart.toString().padStart(Number(SCALE), "0").slice(0, decimalPlaces);
  const result = decimalPlaces > 0 ? `${intPart}.${fracStr}` : `${intPart}`;
  return negative ? `-${result}` : result;
}

export function addDecimal(a: string, b: string): string {
  return formatDecimal(parseDecimal(a) + parseDecimal(b));
}

export function subtractDecimal(a: string, b: string): string {
  return formatDecimal(parseDecimal(a) - parseDecimal(b));
}

export function multiplyDecimal(a: string, b: string): string {
  const pa = parseDecimal(a);
  const pb = parseDecimal(b);
  // product of two scaled values is scaled^2; divide back by FACTOR
  return formatDecimal((pa * pb) / FACTOR);
}

export function divideDecimal(a: string, b: string, places = 6): string {
  const pb = parseDecimal(b);
  if (pb === 0n) throw new Error("Division by zero");
  const pa = parseDecimal(a);
  // Scale up before dividing to preserve decimal precision
  return formatDecimal((pa * FACTOR) / pb, places);
}

/** Ceiling division for hanger spacing: ceil(a / divisor) as decimal string */
export function ceilDecimalDivide(a: string, divisor: string): string {
  const pa = parseDecimal(a);
  const pd = parseDecimal(divisor);
  if (pd === 0n) throw new Error("Division by zero");
  // Integer ceiling: ceil(pa / pd) in scaled space
  // ceil(A/B) = floor((A + B - 1) / B) for positive values
  const negative = (pa < 0n) !== (pd < 0n);
  if (negative) {
    // For negative result ceiling is same as floor division
    return formatDecimal((pa * FACTOR) / pd);
  }
  const absA = pa < 0n ? -pa : pa;
  const absD = pd < 0n ? -pd : pd;
  // We want ceil(absA / absD) as a whole number (in scaled units is *FACTOR)
  const raw = absA / absD;
  const remainder = absA % absD;
  const ceiling = remainder === 0n ? raw : raw + FACTOR;
  // ceiling is in "fractional units" — need to re-normalize
  // Actually: we want ceil(A_real / D_real) where A_real = pa/FACTOR, D_real = pd/FACTOR
  // = ceil((pa / pd)) as integer
  // pa and pd are both scaled; pa/pd gives real ratio; ceil of that
  const intCeil = pa / pd + (pa % pd !== 0n ? 1n : 0n);
  void raw; void remainder; void ceiling; // suppress unused
  return formatDecimal(intCeil * FACTOR);
}

/**
 * Calculate gross quantity: netQuantity * (1 + wastePercent / 100)
 * Returns decimal string with consistent 6dp precision.
 */
export function calculateGrossQuantity(netQuantity: string, wastePercent: string): string {
  // grossQty = net * (1 + waste/100)
  const wasteFraction = divideDecimal(wastePercent, "100");
  const multiplier = addDecimal("1", wasteFraction);
  return multiplyDecimal(netQuantity, multiplier);
}

/** Compare two decimal strings: -1, 0, 1 */
export function compareDecimal(a: string, b: string): -1 | 0 | 1 {
  const pa = parseDecimal(a);
  const pb = parseDecimal(b);
  if (pa < pb) return -1;
  if (pa > pb) return 1;
  return 0;
}

/** Returns true if value is zero */
export function isZeroDecimal(a: string): boolean {
  try { return parseDecimal(a) === 0n; } catch { return false; }
}
