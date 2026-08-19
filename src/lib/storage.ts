import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DATA_DIR } from "@/db";

export const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

/** 20 MB — comfortably above a phone photo, well below a memory problem. */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/**
 * Writes a file into data/<folder> and returns the path to record in the
 * database, always relative to DATA_DIR so the store can be moved.
 */
export async function storeFile(
  folder: "uploads" | "results",
  file: File,
  extension: string,
): Promise<string> {
  const dir = path.join(DATA_DIR, folder);
  await fs.mkdir(dir, { recursive: true });
  const relative = `${folder}/${randomUUID()}.${extension}`;
  await fs.writeFile(
    path.join(DATA_DIR, relative),
    Buffer.from(await file.arrayBuffer()),
  );
  return relative;
}

/**
 * Resolves a stored path back to an absolute one, refusing anything that
 * escapes DATA_DIR even if the database row were tampered with.
 */
export function resolveStored(relative: string): string {
  const absolute = path.resolve(DATA_DIR, relative);
  const root = path.resolve(DATA_DIR) + path.sep;
  if (!absolute.startsWith(root)) {
    throw new Error("Lokasi berkas di luar penyimpanan aplikasi.");
  }
  return absolute;
}

export async function readStored(relative: string): Promise<Buffer> {
  return fs.readFile(resolveStored(relative));
}

/** Best-effort removal: a missing file must not block deleting its record. */
export async function removeStored(relative: string): Promise<void> {
  try {
    await fs.rm(resolveStored(relative), { force: true });
  } catch {
    // already gone, or never written
  }
}

export function contentTypeFor(relative: string): string {
  const ext = path.extname(relative).slice(1).toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic" || ext === "heif") return "image/heic";
  return "image/jpeg";
}
