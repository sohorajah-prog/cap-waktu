import { NextResponse } from "next/server";
import { findResult } from "@/lib/results-service";
import { contentTypeFor, readStored } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/results/:id/image — menyajikan berkas gambar hasil. */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/results/[id]/image">,
) {
  const id = Number((await ctx.params).id);
  const row = Number.isInteger(id) ? findResult(id) : undefined;
  if (!row) {
    return NextResponse.json({ error: "Gambar tidak ditemukan." }, { status: 404 });
  }

  try {
    const file = await readStored(row.results.outputPath);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": contentTypeFor(row.results.outputPath),
        // Stored images are immutable once written.
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Berkas gambar sudah tidak ada di penyimpanan." },
      { status: 410 },
    );
  }
}
