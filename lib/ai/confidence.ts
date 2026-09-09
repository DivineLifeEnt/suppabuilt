export function isHighConfidence(score: number): boolean {
  return score >= 0.85;
}

export function isMediumConfidence(score: number): boolean {
  return score >= 0.6 && score < 0.85;
}

export function isLowConfidence(score: number): boolean {
  return score < 0.6;
}

export function confidenceLabel(score: number): "high" | "medium" | "low" {
  if (isHighConfidence(score)) return "high";
  if (isMediumConfidence(score)) return "medium";
  return "low";
}
