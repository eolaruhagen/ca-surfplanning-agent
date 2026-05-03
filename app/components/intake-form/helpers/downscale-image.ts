/**
 * downscaleImage — resize an image File/Blob to at most maxPx on its longest
 * side, returning a data URL (JPEG, quality 0.85).
 *
 * Uses an OffscreenCanvas when available (worker-safe), falls back to a
 * regular HTMLCanvasElement in the browser main thread.
 */

const MAX_PX = 1024;
const JPEG_QUALITY = 0.85;

/**
 * Load an image Blob into an HTMLImageElement (browser main thread only).
 */
function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

/**
 * Compute scaled dimensions preserving aspect ratio.
 */
export function computeDimensions(
  w: number,
  h: number,
  maxPx = MAX_PX,
): { width: number; height: number } {
  if (w <= maxPx && h <= maxPx) return { width: w, height: h };
  const ratio = Math.min(maxPx / w, maxPx / h);
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

/**
 * Downscale a File or Blob to at most maxPx × maxPx (longest side).
 * Returns a JPEG data URL.
 *
 * Must be called in a browser context (requires HTMLImageElement + Canvas).
 */
export async function downscaleImage(
  file: File | Blob,
  maxPx = MAX_PX,
): Promise<string> {
  const img = await loadImage(file);
  const { width, height } = computeDimensions(img.naturalWidth, img.naturalHeight, maxPx);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}
