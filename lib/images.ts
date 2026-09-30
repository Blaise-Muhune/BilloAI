export function dataUrlToBlob(dataUrl: string) {
  const [header, data] = dataUrl.split(",");
  const mime = header?.match(/data:(.*?);/)?.[1] || "image/jpeg";
  const binary = atob(data ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mime });
}

export function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(blob);
  });
}

export const PROFILE_PHOTO_SIZE = 800;
const PROFILE_MAX_BYTES = 2 * 1024 * 1024;
const PROFILE_SOURCE_MAX_BYTES = 20 * 1024 * 1024;
const PROFILE_MIN_EDGE = 32;

export type SquareCrop = { x: number; y: number; size: number };

export function defaultSquareCrop(width: number, height: number): SquareCrop {
  const size = Math.min(width, height);
  return { x: (width - size) / 2, y: (height - size) / 2, size };
}

export function clampSquareCrop(width: number, height: number, crop: SquareCrop): SquareCrop {
  const size = Math.min(Math.max(PROFILE_MIN_EDGE, crop.size), width, height);
  const x = Math.min(Math.max(0, crop.x), Math.max(0, width - size));
  const y = Math.min(Math.max(0, crop.y), Math.max(0, height - size));
  return { x, y, size };
}

export async function loadOrientedBitmap(file: Blob): Promise<ImageBitmap> {
  if (file.size > PROFILE_SOURCE_MAX_BYTES) throw new Error("Use a smaller photo.");
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      try {
        return await createImageBitmap(file);
      } catch {
        // Fall through to the Image decoder.
      }
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = await loadHtmlImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, image.naturalWidth);
    canvas.height = Math.max(1, image.naturalHeight);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not read that image.");
    context.drawImage(image, 0, 0);
    if (typeof createImageBitmap === "function") return await createImageBitmap(canvas);
    throw new Error("Could not read that image.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function cropProfilePhoto(source: CanvasImageSource & { width: number; height: number }, crop: SquareCrop) {
  const next = clampSquareCrop(source.width, source.height, crop);
  if (next.size < PROFILE_MIN_EDGE) throw new Error("Use a larger photo.");
  const canvas = document.createElement("canvas");
  canvas.width = PROFILE_PHOTO_SIZE;
  canvas.height = PROFILE_PHOTO_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not read that image.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, next.x, next.y, next.size, next.size, 0, 0, PROFILE_PHOTO_SIZE, PROFILE_PHOTO_SIZE);
  const blob = await jpegUnderLimit(canvas);
  return new File([blob], "avatar.jpg", { type: "image/jpeg" });
}

export async function prepareProfilePhoto(file: Blob, crop?: SquareCrop) {
  const bitmap = await loadOrientedBitmap(file);
  try {
    if (Math.min(bitmap.width, bitmap.height) < PROFILE_MIN_EDGE) throw new Error("Use a larger photo.");
    return await cropProfilePhoto(bitmap, crop ?? defaultSquareCrop(bitmap.width, bitmap.height));
  } finally {
    bitmap.close();
  }
}

function loadHtmlImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read that image."));
    image.src = url;
  });
}

function jpegUnderLimit(canvas: HTMLCanvasElement) {
  return (async () => {
    for (const quality of [0.9, 0.8, 0.68]) {
      const blob = await canvasToJpeg(canvas, quality);
      if (blob.size <= PROFILE_MAX_BYTES) return blob;
    }
    throw new Error("Use a photo under 2 MB.");
  })();
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error("Could not save that photo."));
      else resolve(blob);
    }, "image/jpeg", quality);
  });
}

export function compressImage(file: Blob, maxEdge = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read that image."));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };
    image.src = url;
  });
}
