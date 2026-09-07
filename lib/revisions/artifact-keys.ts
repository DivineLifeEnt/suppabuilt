/**
 * Content-addressed, collision-resistant artifact keys.
 * Scoped by org/project/drawingSet/version.
 */

const KEY_PATTERN = /^[a-zA-Z0-9_\-./]+$/;

/**
 * Validate an artifact key. Throws if the key contains path traversal or is otherwise invalid.
 */
export function validateArtifactKey(key: string): void {
  if (!key || key.length === 0) {
    throw new Error("Artifact key must not be empty");
  }
  if (key.startsWith("/")) {
    throw new Error(`Artifact key must not start with '/': ${key}`);
  }
  if (key.includes("..")) {
    throw new Error(`Artifact key must not contain '..': ${key}`);
  }
  if (key.includes(" ")) {
    throw new Error(`Artifact key must not contain spaces: ${key}`);
  }
  if (!KEY_PATTERN.test(key)) {
    throw new Error(`Artifact key contains invalid characters: ${key}`);
  }
}

/**
 * Key for the source PDF file.
 * → "orgs/{orgId}/projects/{projectId}/drawing-sets/{drawingSetId}/versions/{versionId}/source-{checksum}.pdf"
 */
export function pdfKey(
  orgId: string,
  projectId: string,
  drawingSetId: string,
  versionId: string,
  checksum: string
): string {
  const key = `orgs/${orgId}/projects/${projectId}/drawing-sets/${drawingSetId}/versions/${versionId}/source-${checksum}.pdf`;
  validateArtifactKey(key);
  return key;
}

/**
 * Key for a page render at a specific DPI.
 * → "renders/{pageVersionId}/render-{dpi}dpi-{checksum}.png"
 */
export function renderKey(
  _orgId: string,
  pageVersionId: string,
  dpi: number,
  checksum: string
): string {
  const key = `renders/${pageVersionId}/render-${dpi}dpi-${checksum}.png`;
  validateArtifactKey(key);
  return key;
}

/**
 * Key for a page thumbnail.
 * → "thumbnails/{pageVersionId}/thumb-{checksum}.jpg"
 */
export function thumbnailKey(
  _orgId: string,
  pageVersionId: string,
  checksum: string
): string {
  const key = `thumbnails/${pageVersionId}/thumb-${checksum}.jpg`;
  validateArtifactKey(key);
  return key;
}

/**
 * Key for a diff mask PNG.
 * → "diffs/{comparisonId}/mask-{algorithmVersion}.png"
 */
export function diffMaskKey(comparisonId: string, algorithmVersion: string): string {
  const key = `diffs/${comparisonId}/mask-${algorithmVersion}.png`;
  validateArtifactKey(key);
  return key;
}

/**
 * Key for a diff overlay PNG.
 * → "diffs/{comparisonId}/overlay-{algorithmVersion}.png"
 */
export function diffOverlayKey(comparisonId: string, algorithmVersion: string): string {
  const key = `diffs/${comparisonId}/overlay-${algorithmVersion}.png`;
  validateArtifactKey(key);
  return key;
}
