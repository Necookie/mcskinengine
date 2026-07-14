// @ts-ignore - upng-js ships no type declarations
import UPNG from "upng-js";

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Decodes a base64-encoded PNG file into a raw 64x64 RGBA byte array
 * (row-major, matching Canvas ImageData / generateSkinArray's output).
 * Returns null if the PNG can't be decoded or isn't a 64x64 skin texture.
 */
export function decodePngToRawRgba64(base64Png: string): Uint8Array | null {
  try {
    const bytes = base64ToBytes(base64Png);
    const img = UPNG.decode(bytes.buffer);
    if (img.width !== 64 || img.height !== 64) return null;
    const frames: ArrayBuffer[] = UPNG.toRGBA8(img);
    if (!frames.length) return null;
    return new Uint8Array(frames[0]);
  } catch {
    return null;
  }
}
