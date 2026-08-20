import { NextResponse } from "next/server";
import { GeocodeUnavailable, reverseGeocode } from "@/lib/geocode";
import { matchPlace } from "@/lib/region-match";
import { regionLabel } from "@/lib/wilayah";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/wilayah/lookup?lat=&lon=
 *
 * Menebak wilayah administratif dari koordinat. Koordinat dikirim ke layanan
 * peta pihak ketiga (Nominatim/OpenStreetMap) dari server ini, bukan dari
 * peramban pengguna.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return NextResponse.json({ error: "Lintang tidak sah." }, { status: 400 });
  }
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    return NextResponse.json({ error: "Bujur tidak sah." }, { status: 400 });
  }

  try {
    const place = await reverseGeocode(lat, lon);
    if (!place) {
      return NextResponse.json({
        regions: [],
        label: "",
        unmatched: [],
        note: "Tidak ada wilayah yang terdaftar pada titik ini. Pilih manual.",
      });
    }

    const { regions, unmatched } = matchPlace(place);
    return NextResponse.json({
      regions,
      label: regions.length ? regionLabel(regions) : "",
      unmatched,
      source: place.displayName,
    });
  } catch (error) {
    if (error instanceof GeocodeUnavailable) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error("GET /api/wilayah/lookup", error);
    return NextResponse.json(
      { error: "Pencarian wilayah gagal. Pilih wilayah secara manual." },
      { status: 500 },
    );
  }
}
