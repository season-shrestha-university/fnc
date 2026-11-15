/**
 * Client-side downscaling, WebP encoding, and JPEG fallback helpers for member photos.
 */

export const WEBP_QUALITY = 0.78;
export const MAX_PHOTO_DIMENSION = 600;

function stripFileExtension(fileName: string): string {
  const trimmed = fileName.trim();
  if (!trimmed) return "member-photo";
  const lastDot = trimmed.lastIndexOf(".");
  const base = lastDot > 0 ? trimmed.slice(0, lastDot) : trimmed;
  return base || "member-photo";
}

/**
 * Scales dimensions to fit within `maxDimension` on the longest side while
 * preserving aspect ratio and never upscaling smaller images.
 */
export function calculateScaledDimensions(
  width: number,
  height: number,
  maxDimension = MAX_PHOTO_DIMENSION,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= 0 || longest <= maxDimension) {
    return { width, height };
  }

  const scale = maxDimension / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mimeType, quality),
  );
}

/**
 * Encodes a rendered canvas into a compressed WebP `File`, falling back to
 * compressed JPEG when the browser does not support WebP canvas encoding.
 */
export async function canvasToCompressedPhotoFile(
  canvas: HTMLCanvasElement,
  filenameBase = "member-photo",
): Promise<File> {
  const webpBlob = await canvasToBlob(canvas, "image/webp", WEBP_QUALITY);
  if (webpBlob && webpBlob.type === "image/webp") {
    return new File([webpBlob], `${filenameBase}.webp`, { type: "image/webp" });
  }

  const jpegBlob = await canvasToBlob(canvas, "image/jpeg", WEBP_QUALITY);
  if (jpegBlob && jpegBlob.type === "image/jpeg") {
    return new File([jpegBlob], `${filenameBase}.jpg`, { type: "image/jpeg" });
  }

  throw new Error("Unable to encode photo. Please try again.");
}

type DecodedImage = {
  width: number;
  height: number;
  draw: (
    context: CanvasRenderingContext2D,
    targetWidth: number,
    targetHeight: number,
  ) => void;
  cleanup: () => void;
};

async function decodeImageFile(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (context, targetWidth, targetHeight) =>
          context.drawImage(bitmap, 0, 0, targetWidth, targetHeight),
        cleanup: () => {
          if (typeof bitmap.close === "function") {
            bitmap.close();
          }
        },
      };
    } catch {
      throw new Error("Unable to read the selected image file.");
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () =>
        reject(new Error("Unable to read the selected image file."));
      img.src = objectUrl;
    });

    return {
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
      draw: (context, targetWidth, targetHeight) =>
        context.drawImage(image, 0, 0, targetWidth, targetHeight),
      cleanup: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

/**
 * Decodes a selected image `File`, downscales it to fit within
 * `MAX_PHOTO_DIMENSION`, and encodes it as compressed WebP (or fallback JPEG).
 */
export async function compressImageFileToPhoto(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select an image file");
  }

  const decoded = await decodeImageFile(file);
  const canvas = document.createElement("canvas");

  try {
    if (decoded.width <= 0 || decoded.height <= 0) {
      throw new Error("Unable to read the selected image file.");
    }

    const target = calculateScaledDimensions(decoded.width, decoded.height);
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Unable to process photo in this browser.");
    }

    decoded.draw(context, target.width, target.height);
    return await canvasToCompressedPhotoFile(
      canvas,
      stripFileExtension(file.name),
    );
  } finally {
    decoded.cleanup();
    canvas.width = 0;
    canvas.height = 0;
  }
}
