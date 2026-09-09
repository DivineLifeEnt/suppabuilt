import type { SymbolDetection } from "./types";
import { iou } from "./coordinates";

// Non-maximum suppression to remove overlapping detections

export function suppressDuplicates(
  detections: SymbolDetection[],
  iouThreshold = 0.3
): SymbolDetection[] {
  if (detections.length === 0) return [];

  // Sort by confidence descending
  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
  const kept: SymbolDetection[] = [];
  const suppressed = new Set<number>();

  for (let i = 0; i < sorted.length; i++) {
    if (suppressed.has(i)) continue;

    kept.push(sorted[i]);

    for (let j = i + 1; j < sorted.length; j++) {
      if (suppressed.has(j)) continue;
      // Only suppress detections of the same symbol type
      if (sorted[i].symbolType !== sorted[j].symbolType) continue;
      const overlap = iou(sorted[i].box, sorted[j].box);
      if (overlap >= iouThreshold) {
        suppressed.add(j);
      }
    }
  }

  return kept;
}
