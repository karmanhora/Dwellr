import { PROPERTY_PHOTO_MAX_BYTES } from "@hauscrawl/core";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

type CompressOptions = {
  maxEdge: number;
  quality?: number;
  square?: boolean;
};

export type CompressedImage = {
  blob: Blob;
  width: number;
  height: number;
};

/**
 * Downscales in the browser before upload: phone photos are routinely 5–12 MB
 * and the bucket caps objects at 5 MiB. The original is never sent, so EXIF
 * (including GPS) is not carried into storage either.
 */
export async function compressImage(
  file: File,
  { maxEdge, quality = 0.82, square = false }: CompressOptions,
): Promise<CompressedImage> {
  if (!ALLOWED.includes(file.type)) {
    throw new Error("Use a JPG, PNG, or WebP image.");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("That file is over 25 MB. Choose a smaller image.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("That image couldn't be read. Try exporting it as a JPG.");
  }

  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    let width = Math.max(1, Math.round(bitmap.width * scale));
    let height = Math.max(1, Math.round(bitmap.height * scale));

    let sx = 0;
    let sy = 0;
    let sw = bitmap.width;
    let sh = bitmap.height;

    if (square) {
      const side = Math.min(bitmap.width, bitmap.height);
      sx = Math.round((bitmap.width - side) / 2);
      sy = Math.round((bitmap.height - side) / 2);
      sw = side;
      sh = side;
      width = Math.min(maxEdge, side);
      height = width;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser couldn't prepare the image.");

    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", quality);
    });

    if (!blob) throw new Error("That image couldn't be prepared for upload.");
    if (blob.size > PROPERTY_PHOTO_MAX_BYTES) {
      throw new Error("That photo is still over 5 MB after resizing. Try another image.");
    }

    return { blob, width, height };
  } finally {
    bitmap.close();
  }
}
