import { put } from "@vercel/blob";

function sanitizeFilename(value: string): string {
  const cleaned = String(value || "image")
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);

  return cleaned || "image";
}

export async function uploadImageToBlob(
  folder: string,
  file: Express.Multer.File,
): Promise<string> {
  if (!file?.buffer?.length) {
    throw new Error("EMPTY_UPLOAD");
  }

  const original = String(file.originalname || "").toLowerCase();
  const match = original.match(/\.(jpg|jpeg|png|webp)$/);
  const extension = match ? "." + match[1] : ".jpg";

  const baseName = sanitizeFilename(
    String(file.originalname || "image").replace(
      /\.(jpg|jpeg|png|webp)$/i,
      "",
    ),
  );

  const cleanFolder = String(folder).replace(/^\/+|\/+$/g, "");
  const pathname =
    cleanFolder +
    "/" +
    Date.now() +
    "-" +
    Math.random().toString(36).slice(2, 10) +
    "-" +
    baseName +
    extension;

  const blob = await put(pathname, file.buffer, {
    access: "public",
    contentType: file.mimetype || "image/jpeg",
    addRandomSuffix: false,
  });

  return blob.url;
}
