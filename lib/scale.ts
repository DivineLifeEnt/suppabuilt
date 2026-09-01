export function calculateScale(pixelDistance: number, realDistanceFeet: number): number {
  return realDistanceFeet / pixelDistance;
}

export function pixelsToFeet(pixels: number, scale: number): number {
  return pixels * scale;
}

export function feetToPixels(feet: number, scale: number): number {
  if (scale === 0) return 0;
  return feet / scale;
}

export function formatMeasurement(feet: number): string {
  if (feet < 1) return `${(feet * 12).toFixed(1)}"`;
  const wholeFeet = Math.floor(feet);
  const inches = Math.round((feet - wholeFeet) * 12);
  if (inches === 0) return `${wholeFeet}'`;
  return `${wholeFeet}'-${inches}"`;
}

export function distanceBetweenPoints(
  x1: number, y1: number,
  x2: number, y2: number
): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

export function polygonArea(points: { x: number; y: number }[]): number {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area / 2);
}
