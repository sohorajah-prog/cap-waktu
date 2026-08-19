import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { contentTypeFor, readStored } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/uploads/:id/image — menyajikan gambar asli sebelum diberi legenda. */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/uploads/[id]/image">,
) {
  const id = Number((await ctx.params).id);
  const upload = Number.isInteger(id)
    ? db.select().from(schema.uploads).where(eq(schema.uploads.id, id)).get()
    : undefined;

  if (!upload) {
    return NextResponse.json({ error: "Gambar tidak ditemukan." }, { status: 404 });
  }

  try {
    const file = await readStored(upload.filePath);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": contentTypeFor(upload.filePath),
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
