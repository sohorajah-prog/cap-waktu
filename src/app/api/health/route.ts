import { NextResponse } from "next/server";
import { regionCount } from "@/lib/region-match";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health — dipakai Docker dan Coolify untuk memastikan wadahnya siap.
 *
 * Tidak sekadar menjawab 200: ia menyentuh basis data, sehingga volume yang
 * gagal ter-mount atau seed yang gagal dimuat ketahuan sejak awal, bukan baru
 * saat pengguna pertama menekan tombol.
 */
export async function GET() {
  try {
    const regions = regionCount();
    if (regions === 0) {
      return NextResponse.json(
        { status: "degraded", regions, error: "Daftar wilayah kosong." },
        { status: 503 },
      );
    }
    return NextResponse.json({ status: "ok", regions });
  } catch (error) {
    console.error("GET /api/health", error);
    return NextResponse.json(
      { status: "error", error: "Basis data tidak dapat dibaca." },
      { status: 503 },
    );
  }
}
