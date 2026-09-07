"use client";

import { useRevisionsStore } from "@/stores/revisionsStore";
import { SideBySideComparison } from "./SideBySideComparison";
import { SliderComparison } from "./SliderComparison";
import { BlinkComparison } from "./BlinkComparison";
import { OverlayComparison } from "./OverlayComparison";
import { DifferenceView } from "./DifferenceView";

type Props = {
  baseImageUrl?: string;
  compImageUrl?: string;
  diffMaskUrl?: string;
  diffOverlayUrl?: string;
};

export function ComparisonViewer({ baseImageUrl, compImageUrl, diffMaskUrl, diffOverlayUrl }: Props) {
  const { comparisonMode } = useRevisionsStore();

  switch (comparisonMode) {
    case "side-by-side":
      return <SideBySideComparison baseImageUrl={baseImageUrl} compImageUrl={compImageUrl} />;

    case "slider":
      return <SliderComparison baseImageUrl={baseImageUrl} compImageUrl={compImageUrl} />;

    case "blink":
      return <BlinkComparison baseImageUrl={baseImageUrl} compImageUrl={compImageUrl} />;

    case "overlay":
      return <OverlayComparison baseImageUrl={baseImageUrl} compImageUrl={compImageUrl} />;

    case "difference":
      return <DifferenceView diffMaskUrl={diffMaskUrl} diffOverlayUrl={diffOverlayUrl} />;

    default:
      return <SideBySideComparison baseImageUrl={baseImageUrl} compImageUrl={compImageUrl} />;
  }
}
