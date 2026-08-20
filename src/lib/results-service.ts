import "server-only";

import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { ResultDTO } from "./api";
import { removeStored } from "./storage";

/** Thrown for input the client got wrong; routes turn it into a 400. */
export class InvalidInput extends Error {}

const POSITIONS = ["bawah", "atas", "kiri", "kanan"] as const;
const FAMILIES = ["sans", "mono", "serif"] as const;
const FORMATS = ["jpg", "png"] as const;

export type ResultSettingsInput = {
  locationName: string;
  regionCode: string | null;
  regionLabel: string;
  latitude: string | null;
  longitude: string | null;
  dateFormat: string;
  legendPosition: (typeof POSITIONS)[number];
  fontSize: number;
  fontColor: string;
  fontFamily: (typeof FAMILIES)[number];
  showPlate: boolean;
  format: (typeof FORMATS)[number];
  width: number;
  height: number;
  stampedAt: Date;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new InvalidInput("Pengaturan legenda tidak terbaca.");
  }
  return value as Record<string, unknown>;
}

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string,
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new InvalidInput(`${label} tidak dikenali.`);
  }
  return value as T;
}

/** Coordinates arrive as text and stay as text, per the schema. */
function coordinate(value: unknown, label: string): string | null {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).trim();
  if (text === "") return null;
  const asNumber = Number(text);
  if (!Number.isFinite(asNumber)) {
    throw new InvalidInput(`${label} harus berupa angka.`);
  }
  return text;
}

function wholeNumber(value: unknown, label: string, min: number, max: number) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new InvalidInput(`${label} harus bilangan bulat ${min}–${max}.`);
  }
  return n;
}

export function parseSettings(raw: unknown): ResultSettingsInput {
  const input = asRecord(raw);

  const locationName = String(input.locationName ?? "").trim();
  if (locationName.length > 200) {
    throw new InvalidInput("Nama lokasi maksimal 200 karakter.");
  }

  const dateFormat = String(input.dateFormat ?? "").trim();
  if (!dateFormat || dateFormat.length > 60) {
    throw new InvalidInput("Format tanggal tidak valid.");
  }

  const fontColor = String(input.fontColor ?? "");
  if (!/^#[0-9a-fA-F]{6}$/.test(fontColor)) {
    throw new InvalidInput("Warna teks harus berupa kode heks, misalnya #ffffff.");
  }

  const stampedAt = new Date(String(input.stampedAt ?? ""));
  if (Number.isNaN(stampedAt.getTime())) {
    throw new InvalidInput("Waktu cap tidak terbaca.");
  }

  const regionCode = input.regionCode == null ? null : String(input.regionCode);
  if (regionCode !== null && !/^[0-9]{2}(\.[0-9]{2}){0,2}(\.[0-9]{4})?$/.test(regionCode)) {
    throw new InvalidInput("Kode wilayah tidak sah.");
  }
  const regionLabel = String(input.regionLabel ?? "").trim();
  if (regionLabel.length > 250) {
    throw new InvalidInput("Nama wilayah terlalu panjang.");
  }

  return {
    locationName,
    regionCode,
    regionLabel,
    latitude: coordinate(input.latitude, "Lintang"),
    longitude: coordinate(input.longitude, "Bujur"),
    dateFormat,
    legendPosition: oneOf(input.legendPosition, POSITIONS, "Posisi legenda"),
    fontSize: wholeNumber(input.fontSize, "Ukuran huruf", 8, 200),
    fontColor,
    fontFamily: oneOf(input.fontFamily, FAMILIES, "Jenis huruf"),
    showPlate: Boolean(input.showPlate),
    format: oneOf(input.format, FORMATS, "Format berkas"),
    width: wholeNumber(input.width, "Lebar gambar", 1, 30000),
    height: wholeNumber(input.height, "Tinggi gambar", 1, 30000),
    stampedAt,
  };
}

type JoinedRow = { results: schema.Result; uploads: schema.Upload | null };

export function toDTO({ results: result, uploads: upload }: JoinedRow): ResultDTO {
  return {
    id: result.id,
    uploadId: result.uploadId,
    fileName: upload?.fileName ?? "",
    format: result.outputFormat,
    width: result.width,
    height: result.height,
    stampedAt: result.stampedAt.toISOString(),
    createdAt: result.createdAt.toISOString(),
    imageUrl: `/api/results/${result.id}/image`,
    originalUrl: `/api/uploads/${result.uploadId}/image`,
    settings: {
      locationName: result.locationName,
      regionCode: result.regionCode,
      regionLabel: result.regionLabel ?? "",
      latitude: result.latitude === null ? null : Number(result.latitude),
      longitude: result.longitude === null ? null : Number(result.longitude),
      dateFormat: result.dateFormat,
      legendPosition: result.legendPosition,
      fontSize: result.fontSize,
      fontColor: result.fontColor,
      fontFamily: result.fontFamily,
      showPlate: result.showPlate,
    },
  };
}

export function listResults(limit = 60): ResultDTO[] {
  return db
    .select()
    .from(schema.results)
    .leftJoin(schema.uploads, eq(schema.results.uploadId, schema.uploads.id))
    .orderBy(desc(schema.results.createdAt), desc(schema.results.id))
    .limit(limit)
    .all()
    .map(toDTO);
}

export function findResult(id: number): JoinedRow | undefined {
  return db
    .select()
    .from(schema.results)
    .leftJoin(schema.uploads, eq(schema.results.uploadId, schema.uploads.id))
    .where(eq(schema.results.id, id))
    .get();
}

/**
 * Removes the result, its stored image, and the original upload it came from.
 * The database row goes first: an orphaned file is recoverable, a row pointing
 * at a deleted file is not.
 */
export async function deleteResult(id: number): Promise<boolean> {
  const row = findResult(id);
  if (!row) return false;

  db.delete(schema.results).where(eq(schema.results.id, id)).run();
  db.delete(schema.uploads).where(eq(schema.uploads.id, row.results.uploadId)).run();

  await removeStored(row.results.outputPath);
  if (row.uploads) await removeStored(row.uploads.filePath);
  return true;
}

export async function deleteAllResults(): Promise<number> {
  const rows = db
    .select()
    .from(schema.results)
    .leftJoin(schema.uploads, eq(schema.results.uploadId, schema.uploads.id))
    .all();

  db.delete(schema.results).run();
  db.delete(schema.uploads).run();

  await Promise.all(
    rows.flatMap((row) => [
      removeStored(row.results.outputPath),
      ...(row.uploads ? [removeStored(row.uploads.filePath)] : []),
    ]),
  );
  return rows.length;
}
