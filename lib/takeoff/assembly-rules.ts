// Safe assembly rule evaluator — NO eval, NO Function(), NO arbitrary code.
import type { AssemblyRule } from "./types";
import { applyAssemblyRule, type RuleContext } from "./calculations";

// Re-export RuleContext for consumers
export type { RuleContext };

/**
 * Evaluate an assembly rule safely.
 * Dispatches to applyAssemblyRule which uses only decimal.ts functions and a strict switch.
 */
export function evaluateAssemblyRule(rule: AssemblyRule, context: RuleContext): string {
  return applyAssemblyRule(rule, context);
}
