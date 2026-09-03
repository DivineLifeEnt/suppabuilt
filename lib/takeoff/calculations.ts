import type { AssemblyRule } from "./types";
import {
  addDecimal,
  multiplyDecimal,
  divideDecimal,
  ceilDecimalDivide,
  formatDecimal,
  parseDecimal,
} from "./decimal";
import { mmToQuantityUnit, mm2ToQuantityUnit } from "./units";

// ─── Rule context ─────────────────────────────────────────────────────────────
export type RuleContext = {
  sourceCount?: number;
  sourceLengthMm?: number;
  sourceAreaMm2?: number;
  itemFields?: Record<string, string>;
};

/**
 * Apply an assembly rule given source context to produce a net quantity string.
 * NO eval, NO Function(), NO arbitrary code execution.
 */
export function applyAssemblyRule(rule: AssemblyRule, context: RuleContext): string {
  switch (rule.kind) {
    case "fixed": {
      return rule.quantity;
    }

    case "multiply-by-source-count": {
      const count = context.sourceCount ?? 1;
      return multiplyDecimal(String(count), rule.factor);
    }

    case "multiply-length-by-factor": {
      if (context.sourceLengthMm == null) {
        throw new Error("multiply-length-by-factor requires sourceLengthMm in context");
      }
      // Convert mm to linear-foot first, then multiply by factor
      const lengthFt = mmToQuantityUnit(context.sourceLengthMm, "linear-foot");
      return multiplyDecimal(lengthFt, rule.factor);
    }

    case "multiply-area-by-factor": {
      if (context.sourceAreaMm2 == null) {
        throw new Error("multiply-area-by-factor requires sourceAreaMm2 in context");
      }
      const areaSf = mm2ToQuantityUnit(context.sourceAreaMm2, "square-foot");
      return multiplyDecimal(areaSf, rule.factor);
    }

    case "ceiling-length-divided-by-spacing": {
      if (context.sourceLengthMm == null) {
        throw new Error("ceiling-length-divided-by-spacing requires sourceLengthMm in context");
      }
      const lengthFt = mmToQuantityUnit(context.sourceLengthMm, "linear-foot");
      // ceil(lengthFt / spacingFeet)
      return ceilDecimalDivide(lengthFt, rule.spacingFeet);
    }

    case "conditional": {
      const fields = context.itemFields ?? {};
      const fieldValue = fields[rule.field] ?? "";
      return fieldValue === rule.equals ? rule.thenQuantity : rule.elseQuantity;
    }

    default: {
      // TypeScript exhaustiveness check
      const _exhaustive: never = rule;
      throw new Error(`Unknown assembly rule kind: ${(_exhaustive as { kind: string }).kind}`);
    }
  }
}

/** Validate an assembly rule (no eval, no arbitrary code) */
export function validateAssemblyRule(rule: AssemblyRule): { valid: boolean; error?: string } {
  try {
    switch (rule.kind) {
      case "fixed": {
        parseDecimal(rule.quantity);
        return { valid: true };
      }
      case "multiply-by-source-count": {
        parseDecimal(rule.factor);
        return { valid: true };
      }
      case "multiply-length-by-factor": {
        parseDecimal(rule.factor);
        return { valid: true };
      }
      case "multiply-area-by-factor": {
        parseDecimal(rule.factor);
        return { valid: true };
      }
      case "ceiling-length-divided-by-spacing": {
        const spacing = parseDecimal(rule.spacingFeet);
        if (spacing <= 0n) return { valid: false, error: "spacingFeet must be positive" };
        return { valid: true };
      }
      case "conditional": {
        if (!rule.field || typeof rule.field !== "string") {
          return { valid: false, error: "conditional rule requires a field name" };
        }
        if (rule.field.includes("(") || rule.field.includes(")") || rule.field.includes(";")) {
          return { valid: false, error: "conditional field must be a plain field name" };
        }
        parseDecimal(rule.thenQuantity);
        parseDecimal(rule.elseQuantity);
        return { valid: true };
      }
      default: {
        const _exhaustive: never = rule;
        return { valid: false, error: `Unknown rule kind: ${(_exhaustive as { kind: string }).kind}` };
      }
    }
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : "Invalid rule" };
  }
}

/** Simple helper: format a number as a decimal string */
export function numberToDecimal(n: number, places = 6): string {
  return formatDecimal(parseDecimal(n.toFixed(places + 2).slice(0, -(places + 2 - places - 1) || undefined)), places);
}

void addDecimal; void divideDecimal; // keep imports live
