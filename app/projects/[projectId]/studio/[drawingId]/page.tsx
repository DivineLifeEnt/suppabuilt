import type { Metadata } from "next";
import { StudioShell } from "@/components/studio/StudioShell";

export const metadata: Metadata = { title: "Studio" };

type Props = { params: Promise<{ projectId: string; drawingId: string }> };

export default async function StudioPage({ params }: Props) {
  // params consumed server-side; StudioShell is fully client-driven
  await params;
  return <StudioShell />;
}
