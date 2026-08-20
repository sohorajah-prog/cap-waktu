import { NextResponse } from "next/server";
import { asc, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";

export const runtime = "nodejs";

/**
 * GET /api/wilayah          -> daftar provinsi
 * GET /api/wilayah?parent=X -> daftar wilayah di bawah X
 *
 * Satu tingkat per permintaan: memuat 83 ribu kelurahan sekaligus ke browser
 * jelas bukan pilihan.
 */
export async function GET(request: Request) {
  const parent = new URL(request.url).searchParams.get("parent");

  if (parent !== null && !/^[0-9]{2}(\.[0-9]{2}){0,2}$/.test(parent)) {
    return NextResponse.json({ error: "Kode wilayah tidak sah." }, { status: 400 });
  }

  const regions = db
    .select({
      code: schema.regions.code,
      name: schema.regions.name,
      level: schema.regions.level,
    })
    .from(schema.regions)
    .where(
      parent === null
        ? isNull(schema.regions.parentCode)
        : eq(schema.regions.parentCode, parent),
    )
    .orderBy(asc(schema.regions.name))
    .all();

  return NextResponse.json(
    { regions },
    {
      // The list only changes when Permendagri does.
      headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
    },
  );
}
