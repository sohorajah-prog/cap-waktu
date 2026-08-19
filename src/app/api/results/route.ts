import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import {
  deleteAllResults,
  findResult,
  InvalidInput,
  listResults,
  parseSettings,
  toDTO,
} from "@/lib/results-service";
import {
  IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  removeStored,
  storeFile,
} from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function requireImage(value: FormDataEntryValue | null, label: string): File {
  if (!(value instanceof File) || value.size === 0) {
    throw new InvalidInput(`${label} tidak terkirim.`);
  }
  if (value.size > MAX_UPLOAD_BYTES) {
    throw new InvalidInput(`${label} melebihi 20 MB.`);
  }
  if (!IMAGE_TYPES[value.type]) {
    throw new InvalidInput(`${label} harus berupa gambar JPG, PNG, atau WebP.`);
  }
  return value;
}

/** GET /api/results — daftar riwayat, terbaru dulu. */
export async function GET(request: Request) {
  const limitParam = new URL(request.url).searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitParam) || 60, 1), 200);
  return NextResponse.json({ results: listResults(limit) });
}

/**
 * POST /api/results — menyimpan satu hasil.
 * multipart/form-data: original, result, settings (JSON).
 */
export async function POST(request: Request) {
  let storedOriginal: string | null = null;
  let storedResult: string | null = null;

  try {
    const form = await request.formData();
    const original = requireImage(form.get("original"), "Gambar asli");
    const output = requireImage(form.get("result"), "Gambar hasil");

    const rawSettings = form.get("settings");
    if (typeof rawSettings !== "string") {
      throw new InvalidInput("Pengaturan legenda tidak terkirim.");
    }
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawSettings);
    } catch {
      throw new InvalidInput("Pengaturan legenda bukan JSON yang sah.");
    }
    const settings = parseSettings(parsedJson);

    if (IMAGE_TYPES[output.type] !== settings.format) {
      throw new InvalidInput("Format berkas tidak cocok dengan gambar hasil.");
    }

    storedOriginal = await storeFile("uploads", original, IMAGE_TYPES[original.type]);
    storedResult = await storeFile("results", output, settings.format);

    const id = db.transaction((tx) => {
      const upload = tx
        .insert(schema.uploads)
        .values({
          filePath: storedOriginal!,
          fileName: original.name || "foto",
          mimeType: original.type,
          sizeBytes: original.size,
        })
        .returning({ id: schema.uploads.id })
        .get();

      return tx
        .insert(schema.results)
        .values({
          uploadId: upload.id,
          locationName: settings.locationName,
          latitude: settings.latitude,
          longitude: settings.longitude,
          dateFormat: settings.dateFormat,
          legendPosition: settings.legendPosition,
          fontSize: settings.fontSize,
          fontColor: settings.fontColor,
          fontFamily: settings.fontFamily,
          showPlate: settings.showPlate,
          outputPath: storedResult!,
          outputFormat: settings.format,
          width: settings.width,
          height: settings.height,
          stampedAt: settings.stampedAt,
        })
        .returning({ id: schema.results.id })
        .get().id;
    });

    return NextResponse.json({ result: toDTO(findResult(id)!) }, { status: 201 });
  } catch (error) {
    // The rows never landed, so the files must not linger either.
    if (storedOriginal) await removeStored(storedOriginal);
    if (storedResult) await removeStored(storedResult);

    if (error instanceof InvalidInput) return badRequest(error.message);
    console.error("POST /api/results", error);
    return NextResponse.json(
      { error: "Hasil gagal disimpan. Coba unduh ulang." },
      { status: 500 },
    );
  }
}

/** DELETE /api/results — mengosongkan seluruh riwayat. */
export async function DELETE() {
  try {
    const removed = await deleteAllResults();
    return NextResponse.json({ removed });
  } catch (error) {
    console.error("DELETE /api/results", error);
    return NextResponse.json({ error: "Riwayat gagal dikosongkan." }, { status: 500 });
  }
}
