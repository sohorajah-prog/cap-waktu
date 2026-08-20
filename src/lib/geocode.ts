import "server-only";

/**
 * Reverse geocoding lives on the server, not in the browser: the request then
 * carries this app's identity and address instead of the user's, and one cache
 * serves everybody.
 */

export type GeocodedPlace = {
  village: string | null;
  district: string | null;
  regency: string | null;
  /**
   * Nearly every Indonesian regency name exists twice — "Kota Bekasi" and
   * "Kabupaten Bekasi" — so which OSM field carried the name is the tiebreaker.
   */
  regencyKind: "kota" | "kabupaten" | null;
  province: string | null;
  displayName: string;
};

const ENDPOINT = "https://nominatim.openstreetmap.org/reverse";

const USER_AGENT =
  process.env.CAP_WAKTU_GEOCODER_UA ??
  "CapWaktu/0.1 (https://github.com/sohorajah-prog/cap-waktu)";

/** Nominatim's policy allows at most one request per second. */
const MIN_INTERVAL_MS = 1100;
let queue: Promise<unknown> = Promise.resolve();
let lastCall = 0;

function schedule<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = MIN_INTERVAL_MS - (Date.now() - lastCall);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCall = Date.now();
    return task();
  });
  // Keep the chain alive even when one call rejects.
  queue = run.catch(() => {});
  return run;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 500;
const cache = new Map<string, { at: number; place: GeocodedPlace | null }>();

/** ~11 m of precision: finer than that is noise for a village lookup. */
function cacheKey(lat: number, lon: number) {
  return lat.toFixed(4) + "," + lon.toFixed(4);
}

function pick(address: Record<string, string>, keys: string[]): string | null {
  for (const key of keys) {
    const value = address[key];
    if (value && value.trim()) return value.trim();
  }
  return null;
}

export class GeocodeUnavailable extends Error {}

export async function reverseGeocode(
  lat: number,
  lon: number,
): Promise<GeocodedPlace | null> {
  const key = cacheKey(lat, lon);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.place;

  const url =
    `${ENDPOINT}?format=jsonv2&lat=${lat}&lon=${lon}` +
    `&zoom=18&addressdetails=1&accept-language=id`;

  const place = await schedule(async () => {
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(12000),
      });
    } catch {
      throw new GeocodeUnavailable(
        "Layanan peta tidak dapat dihubungi. Pilih wilayah secara manual.",
      );
    }

    if (response.status === 429 || response.status === 503) {
      throw new GeocodeUnavailable(
        "Layanan peta sedang membatasi permintaan. Coba lagi sebentar lagi, atau pilih wilayah manual.",
      );
    }
    if (!response.ok) {
      throw new GeocodeUnavailable(
        "Layanan peta menolak permintaan. Pilih wilayah secara manual.",
      );
    }

    const body = (await response.json()) as {
      address?: Record<string, string>;
      display_name?: string;
      error?: string;
    };
    if (body.error || !body.address) return null;

    const a = body.address;
    const cityLike = pick(a, ["city", "town"]);
    const countyLike = pick(a, ["regency", "county"]);

    return {
      // Field names vary by place; these are the ones Indonesia actually uses.
      village: pick(a, ["village", "suburb", "neighbourhood", "hamlet", "quarter"]),
      district: pick(a, ["city_district", "subdistrict", "municipality", "district"]),
      regency: cityLike ?? countyLike,
      regencyKind: cityLike ? "kota" : countyLike ? "kabupaten" : null,
      province: pick(a, ["state", "province", "region"]),
      displayName: body.display_name ?? "",
    } satisfies GeocodedPlace;
  });

  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
  cache.set(key, { at: Date.now(), place });
  return place;
}
