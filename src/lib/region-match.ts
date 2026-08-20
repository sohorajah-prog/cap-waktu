import "server-only";

import { and, eq, like, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { GeocodedPlace } from "./geocode";
import type { Region } from "./wilayah";

/**
 * Snaps free-form geocoder names onto official Permendagri codes.
 *
 * The geocoder is inconsistent about Indonesia: it drops the kecamatan on most
 * lookups and sometimes the province too. So matching runs top-down where it
 * can and recovers missing rungs from the code hierarchy where it cannot —
 * finding the village inside a known regency hands back its kecamatan for free.
 */

const NOISE =
  /^(kabupaten administrasi|kota administrasi|kabupaten|kotamadya|kota|kecamatan|kelurahan|distrik|desa|kel\.|kec\.|kab\.)\s+/i;

/** Province spellings the geocoder uses that the official list does not. */
const PROVINCE_ALIASES: Record<string, string> = {
  "dki jakarta": "daerah khusus ibukota jakarta",
  "jakarta": "daerah khusus ibukota jakarta",
  "daerah khusus jakarta": "daerah khusus ibukota jakarta",
  "di yogyakarta": "daerah istimewa yogyakarta",
  "diy": "daerah istimewa yogyakarta",
  "yogyakarta": "daerah istimewa yogyakarta",
  "nanggroe aceh darussalam": "aceh",
  "bangka belitung": "kepulauan bangka belitung",
  "riau islands": "kepulauan riau",
  "west java": "jawa barat",
  "central java": "jawa tengah",
  "east java": "jawa timur",
  "special region of yogyakarta": "daerah istimewa yogyakarta",
};

export function normalize(value: string): string {
  let text = value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Strip repeated administrative prefixes: "Kota Administrasi Jakarta Pusat".
  let previous = "";
  while (previous !== text) {
    previous = text;
    text = text.replace(NOISE, "").trim();
  }
  return text;
}

function normalizeProvince(value: string): string {
  const base = normalize(value);
  return PROVINCE_ALIASES[base] ?? base;
}

type Row = { code: string; name: string; level: number };

function childrenOf(parent: string | null, level: number): Row[] {
  return db
    .select({
      code: schema.regions.code,
      name: schema.regions.name,
      level: schema.regions.level,
    })
    .from(schema.regions)
    .where(
      parent === null
        ? eq(schema.regions.level, level)
        : eq(schema.regions.parentCode, parent),
    )
    .all();
}

/** Every region at `level` whose code starts with `prefix`. */
function descendants(prefix: string, level: number): Row[] {
  return db
    .select({
      code: schema.regions.code,
      name: schema.regions.name,
      level: schema.regions.level,
    })
    .from(schema.regions)
    .where(
      and(
        eq(schema.regions.level, level),
        like(schema.regions.code, prefix + ".%"),
      ),
    )
    .all();
}

/** All rows whose normalized name equals `wanted`; usually 0, 1, or 2. */
function candidates(rows: Row[], wanted: string, isProvince = false): Row[] {
  const target = isProvince ? normalizeProvince(wanted) : normalize(wanted);
  if (!target) return [];

  const exact = rows.filter(
    (r) => (isProvince ? normalizeProvince(r.name) : normalize(r.name)) === target,
  );
  if (exact.length) return exact;

  // One-sided containment catches leftovers the prefix strip missed.
  return rows.filter((r) => {
    const name = normalize(r.name);
    return name.startsWith(target + " ") || target.startsWith(name + " ");
  });
}

function findByName(rows: Row[], wanted: string, isProvince = false): Row | null {
  const found = candidates(rows, wanted, isProvince);
  return found.length === 1 ? found[0] : null;
}

/**
 * "Bekasi" matches both the city and the regency. The geocoder's own field
 * choice usually settles it; when it does not, the caller falls back to
 * resolving the ambiguity through the village name.
 */
function pickRegency(rows: Row[], wanted: string, kind: GeocodedPlace["regencyKind"]) {
  const found = candidates(rows, wanted);
  if (found.length <= 1) return { regency: found[0] ?? null, ambiguous: found };

  if (kind) {
    const prefix = kind === "kota" ? "kota" : "kabupaten";
    const narrowed = found.filter((r) => r.name.toLowerCase().startsWith(prefix));
    if (narrowed.length === 1) return { regency: narrowed[0], ambiguous: found };
  }
  return { regency: null, ambiguous: found };
}

export type MatchedChain = {
  regions: Region[];
  /** Levels the geocoder named but that could not be matched to a code. */
  unmatched: string[];
};

export function matchPlace(place: GeocodedPlace): MatchedChain {
  const chain: Region[] = [];
  const unmatched: string[] = [];
  const asRegion = (row: Row): Region => ({
    code: row.code,
    name: row.name,
    level: row.level,
  });

  // 1 — Province.
  let province: Row | null = null;
  if (place.province) {
    province = findByName(childrenOf(null, 1), place.province, true);
    if (!province) unmatched.push("Provinsi");
  }

  // 2 — Regency. Searched nationally when the province is unknown, which also
  //     recovers the province from the winning code.
  let regency: Row | null = null;
  let regencyOptions: Row[] = [];
  if (place.regency) {
    const pool = province ? childrenOf(province.code, 2) : childrenOf(null, 2);
    const picked = pickRegency(pool, place.regency, place.regencyKind);
    regency = picked.regency;
    regencyOptions = picked.ambiguous;

    // Still torn between "Kota X" and "Kabupaten X"? The village decides:
    // whichever one actually contains it is the right one.
    if (!regency && regencyOptions.length > 1 && place.village) {
      const resolved = regencyOptions.filter(
        (option) => findByName(descendants(option.code, 4), place.village!) !== null,
      );
      if (resolved.length === 1) regency = resolved[0];
    }

    if (regency && !province) {
      const code = regency.code.split(".")[0];
      province = childrenOf(null, 1).find((r) => r.code === code) ?? null;
    }
    if (!regency) unmatched.push("Kabupaten/Kota");
  }

  // 3 — District. Usually absent from the geocoder, so it is recovered in step 4.
  let district: Row | null = null;
  if (place.district && regency) {
    district = findByName(childrenOf(regency.code, 3), place.district);
    if (!district) unmatched.push("Kecamatan");
  }

  // 4 — Village. With no district, look through the whole regency: a unique
  //     hit gives back the district too.
  let village: Row | null = null;
  if (place.village) {
    if (district) {
      village = findByName(childrenOf(district.code, 4), place.village);
    } else if (regency) {
      village = findByName(descendants(regency.code, 4), place.village);
      if (village) {
        const districtCode = village.code.split(".").slice(0, 3).join(".");
        district =
          childrenOf(regency.code, 3).find((r) => r.code === districtCode) ?? null;
      }
    }
    if (!village) unmatched.push("Kelurahan/Desa");
  }

  if (province) chain.push(asRegion(province));
  if (regency) chain.push(asRegion(regency));
  if (district) chain.push(asRegion(district));
  if (village) chain.push(asRegion(village));

  return { regions: chain, unmatched };
}

/** Kept for the route's sanity check that the seed actually loaded. */
export function regionCount(): number {
  const row = db
    .select({ n: sql<number>`count(*)` })
    .from(schema.regions)
    .get();
  return row?.n ?? 0;
}
