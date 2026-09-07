/**
 * Image difference computation — runs in background jobs, server-side only.
 * Uses `sharp` for raster processing.
 */
import type { AffineMatrix, ComparisonMetrics } from "./types";
import type { NormalizedBounds } from "@/lib/markup/types";
import { transformPoint } from "./matrices";

export type DiffConfig = {
  dpi: number;              // rasterization DPI, default 150
  maxMegapixels: number;    // default 100
  tileSize: number;         // default 2048
  noiseThreshold: number;   // 0..255, default 8
  minRegionAreaPx: number;  // minimum connected-component area, default 100
  maxRegions: number;       // cap at 5000
  algorithmVersion: string; // "v1"
};

export const DEFAULT_DIFF_CONFIG: DiffConfig = {
  dpi: 150,
  maxMegapixels: 100,
  tileSize: 2048,
  noiseThreshold: 8,
  minRegionAreaPx: 100,
  maxRegions: 5000,
  algorithmVersion: "v1",
};

export type DiffRegion = {
  bounds: NormalizedBounds;
  kind: "added" | "removed" | "changed";
  changedPixelCount: number;
  strength: number;
};

export type DiffResult = {
  regions: DiffRegion[];
  metrics: ComparisonMetrics;
  maskBuffer: Buffer;    // PNG, grayscale difference mask
  overlayBuffer: Buffer; // PNG, colored overlay (magenta=old, cyan=new)
};

/**
 * Process two raster image buffers (PNG/JPEG) with confirmed alignment transform.
 * Applies alignment to the comparison image, then computes pixel-level difference.
 */
export async function computeDiff(
  baseBuffer: Buffer,
  comparisonBuffer: Buffer,
  alignmentMatrix: AffineMatrix,
  config: DiffConfig = DEFAULT_DIFF_CONFIG
): Promise<DiffResult> {
  const start = Date.now();

  // Lazy import so this doesn't pull sharp into browser bundles
  const sharp = (await import("sharp")).default;

  // Load images
  const baseMeta = await sharp(baseBuffer).metadata();
  const compMeta = await sharp(comparisonBuffer).metadata();

  const width = baseMeta.width ?? 1024;
  const height = baseMeta.height ?? 1024;
  const totalPixels = width * height;

  // Check megapixel limit
  const megapixels = totalPixels / 1_000_000;
  if (megapixels > config.maxMegapixels) {
    throw new Error(
      `Image size ${megapixels.toFixed(1)}MP exceeds limit ${config.maxMegapixels}MP`
    );
  }

  // Get base as raw RGBA
  const baseRaw = await sharp(baseBuffer)
    .resize(width, height, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Get comparison as raw RGBA, potentially resized
  const compWidth = compMeta.width ?? width;
  const compHeight = compMeta.height ?? height;
  const compRaw = await sharp(comparisonBuffer)
    .resize(compWidth, compHeight, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = baseRaw.info.channels;
  const compChannels = compRaw.info.channels;

  // Build warped comparison buffer aligned to base coordinate space
  const warpedComp = Buffer.alloc(width * height * channels, 255);

  // Apply inverse alignment: for each base pixel, find corresponding comp pixel
  // alignmentMatrix maps comparison → base, so we need inverse for base → comp lookup
  // We iterate base pixels and look up comp pixels
  const isIdentity =
    alignmentMatrix[0] === 1 &&
    alignmentMatrix[1] === 0 &&
    alignmentMatrix[2] === 0 &&
    alignmentMatrix[3] === 0 &&
    alignmentMatrix[4] === 1 &&
    alignmentMatrix[5] === 0;

  if (isIdentity) {
    // No alignment needed — just use comparison as-is (resize to match base)
    const resizedComp = await sharp(comparisonBuffer)
      .resize(width, height, { fit: "fill" })
      .raw()
      .toBuffer();
    resizedComp.copy(warpedComp);
  } else {
    // Apply affine warp: for each base pixel, compute source comp pixel via inverse transform
    // alignmentMatrix: p_base = M * p_comp → p_comp = M^-1 * p_base
    const { matInverse } = await import("./matrices");
    let invMatrix: AffineMatrix;
    try {
      invMatrix = matInverse(alignmentMatrix);
    } catch {
      // Singular — fall back to identity
      const resizedComp = await sharp(comparisonBuffer)
        .resize(width, height, { fit: "fill" })
        .raw()
        .toBuffer();
      resizedComp.copy(warpedComp);
      invMatrix = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    }

    const compData = compRaw.data;

    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        // Normalized base coords
        const nx = px / width;
        const ny = py / height;

        // Map to comparison coords
        const [cx, cy] = transformPoint(invMatrix, nx, ny);

        // Sample comparison pixel (nearest neighbor)
        const cpx = Math.round(cx * compWidth);
        const cpy = Math.round(cy * compHeight);

        if (cpx < 0 || cpx >= compWidth || cpy < 0 || cpy >= compHeight) {
          // Out of bounds — leave as white (255)
          continue;
        }

        const srcIdx = (cpy * compWidth + cpx) * compChannels;
        const dstIdx = (py * width + px) * channels;

        for (let c = 0; c < channels; c++) {
          warpedComp[dstIdx + c] = compData[srcIdx + Math.min(c, compChannels - 1)];
        }
      }
    }
  }

  // Compute per-pixel difference
  const baseData = baseRaw.data;
  const maskData = Buffer.alloc(width * height);
  const overlayR = Buffer.alloc(width * height);
  const overlayG = Buffer.alloc(width * height);
  const overlayB = Buffer.alloc(width * height);

  let changedPixelCount = 0;

  for (let i = 0; i < width * height; i++) {
    const bi = i * channels;
    const ci = i * channels;

    // Compute luminance difference (simplified — average RGB channels)
    const baseL = (baseData[bi] + baseData[bi + 1] + baseData[bi + 2]) / 3;
    const compL = (warpedComp[ci] + warpedComp[ci + 1] + warpedComp[ci + 2]) / 3;
    const diff = Math.abs(baseL - compL);

    maskData[i] = diff;

    if (diff > config.noiseThreshold) {
      changedPixelCount++;
      // Magenta for old (base), cyan for new (comparison)
      // We'll use a simple blend: if base is lighter, magenta (removed); if comp is lighter, cyan (added)
      if (baseL > compL) {
        // Something removed in comparison (base had content)
        overlayR[i] = 255;
        overlayG[i] = 0;
        overlayB[i] = 255; // magenta
      } else {
        // Something added in comparison
        overlayR[i] = 0;
        overlayG[i] = 255;
        overlayB[i] = 255; // cyan
      }
    } else {
      overlayR[i] = 0;
      overlayG[i] = 0;
      overlayB[i] = 0;
    }
  }

  // Build mask PNG (grayscale)
  const maskBuffer = await sharp(maskData, {
    raw: { width, height, channels: 1 },
  })
    .png()
    .toBuffer();

  // Build overlay PNG (RGB)
  const overlayInterleaved = Buffer.alloc(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    overlayInterleaved[i * 3] = overlayR[i];
    overlayInterleaved[i * 3 + 1] = overlayG[i];
    overlayInterleaved[i * 3 + 2] = overlayB[i];
  }
  const overlayBuffer = await sharp(overlayInterleaved, {
    raw: { width, height, channels: 3 },
  })
    .png()
    .toBuffer();

  // Extract change regions from mask via simple run-length connected components (approximate)
  const regions = extractRegions(
    maskData,
    width,
    height,
    config.noiseThreshold,
    config.minRegionAreaPx,
    config.maxRegions,
    baseData,
    warpedComp,
    channels
  );

  const processingMs = Date.now() - start;

  const metrics: ComparisonMetrics = {
    changedPixelCount,
    totalPixelCount: totalPixels,
    changePercent: (changedPixelCount / totalPixels) * 100,
    regionCount: regions.length,
    processingMs,
    rasterDpi: config.dpi,
    algorithmVersion: config.algorithmVersion,
  };

  return { regions, metrics, maskBuffer, overlayBuffer };
}

/**
 * Simple grid-based region extraction (approximate connected components).
 * Divides the image into blocks and groups blocks with significant change.
 */
function extractRegions(
  maskData: Buffer,
  width: number,
  height: number,
  noiseThreshold: number,
  minAreaPx: number,
  maxRegions: number,
  baseData: Buffer,
  compData: Buffer,
  channels: number
): DiffRegion[] {
  const blockSize = Math.max(16, Math.floor(Math.sqrt(minAreaPx)));
  const blocksX = Math.ceil(width / blockSize);
  const blocksY = Math.ceil(height / blockSize);

  type Block = {
    bx: number;
    by: number;
    changedPx: number;
    totalPx: number;
    sumDiff: number;
    addedPx: number;
    removedPx: number;
  };

  const activeBlocks: Block[] = [];

  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      let changedPx = 0;
      let totalPx = 0;
      let sumDiff = 0;
      let addedPx = 0;
      let removedPx = 0;

      for (let py = by * blockSize; py < Math.min((by + 1) * blockSize, height); py++) {
        for (let px = bx * blockSize; px < Math.min((bx + 1) * blockSize, width); px++) {
          const i = py * width + px;
          const diff = maskData[i];
          totalPx++;
          if (diff > noiseThreshold) {
            changedPx++;
            sumDiff += diff;
            const bi = i * channels;
            const ci = i * channels;
            const bL = (baseData[bi] + baseData[bi + 1] + baseData[bi + 2]) / 3;
            const cL = (compData[ci] + compData[ci + 1] + compData[ci + 2]) / 3;
            if (bL > cL) removedPx++;
            else addedPx++;
          }
        }
      }

      if (changedPx >= minAreaPx / (blockSize * blockSize)) {
        activeBlocks.push({ bx, by, changedPx, totalPx, sumDiff, addedPx, removedPx });
      }
    }
  }

  // Merge adjacent blocks into regions
  const regions: DiffRegion[] = [];
  const visited = new Set<string>();

  for (const block of activeBlocks) {
    const key = `${block.bx},${block.by}`;
    if (visited.has(key)) continue;
    if (regions.length >= maxRegions) break;

    // BFS to find connected region
    const queue = [block];
    visited.add(key);
    let minBx = block.bx;
    let minBy = block.by;
    let maxBx = block.bx;
    let maxBy = block.by;
    let totalChanged = 0;
    let totalAdded = 0;
    let totalRemoved = 0;
    let totalStrength = 0;

    const blockMap = new Map<string, Block>(
      activeBlocks.map((b) => [`${b.bx},${b.by}`, b])
    );

    while (queue.length > 0) {
      const cur = queue.shift()!;
      minBx = Math.min(minBx, cur.bx);
      minBy = Math.min(minBy, cur.by);
      maxBx = Math.max(maxBx, cur.bx);
      maxBy = Math.max(maxBy, cur.by);
      totalChanged += cur.changedPx;
      totalAdded += cur.addedPx;
      totalRemoved += cur.removedPx;
      totalStrength += cur.sumDiff;

      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nk = `${cur.bx + dx},${cur.by + dy}`;
        if (!visited.has(nk) && blockMap.has(nk)) {
          visited.add(nk);
          queue.push(blockMap.get(nk)!);
        }
      }
    }

    const px1 = minBx * blockSize;
    const py1 = minBy * blockSize;
    const px2 = Math.min((maxBx + 1) * blockSize, width);
    const py2 = Math.min((maxBy + 1) * blockSize, height);

    const bounds: NormalizedBounds = {
      x: px1 / width,
      y: py1 / height,
      width: (px2 - px1) / width,
      height: (py2 - py1) / height,
    };

    let kind: "added" | "removed" | "changed";
    if (totalAdded > totalRemoved * 2) kind = "added";
    else if (totalRemoved > totalAdded * 2) kind = "removed";
    else kind = "changed";

    const strength = Math.min(1, totalStrength / (totalChanged * 255));

    regions.push({ bounds, kind, changedPixelCount: totalChanged, strength });
  }

  return regions;
}
