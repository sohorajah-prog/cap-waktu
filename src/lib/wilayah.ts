/** One administrative region as the cascade needs it. */
export type Region = {
  code: string;
  name: string;
  level: number;
};

export const LEVELS = [
  { level: 1, label: "Provinsi", placeholder: "Pilih provinsi" },
  { level: 2, label: "Kabupaten / Kota", placeholder: "Pilih kabupaten atau kota" },
  { level: 3, label: "Kecamatan", placeholder: "Pilih kecamatan" },
  { level: 4, label: "Kelurahan / Desa", placeholder: "Pilih kelurahan atau desa" },
] as const;

/**
 * Names that already state their own kind. "Gampong" (Aceh), "Nagari" (Sumbar)
 * and "Pekon" (Lampung) are the official local word for a desa, so prefixing
 * would give "Desa Gampong Drien". "Kampung" is deliberately absent: it is
 * spread across Sumatra, Bali and Maluku as part of ordinary village names
 * such as Kampung Sawah, where "Desa Kampung Sawah" is correct.
 */
const SELF_DESCRIBING = /^(desa|kelurahan|kel\.|gampong|nagari|pekon)\b/i;

/**
 * The Permendagri code says which kind a village is: the fourth segment runs
 * 1xxx for kelurahan and 2xxx for desa. A leading 3 marks the desa adat of
 * Kabupaten Jayapura, whose names already begin with "Desa Adat".
 */
function villageWord(code: string): string {
  const segment = code.split(".")[3] ?? "";
  if (segment.startsWith("1")) return "Kel. ";
  if (segment.startsWith("2")) return "Desa ";
  return "";
}

/** Prefixes the source data leaves off, so a stamp reads unambiguously. */
function decorate(region: Region): string {
  if (region.level === 3) return "Kec. " + region.name;
  if (region.level === 4) {
    if (SELF_DESCRIBING.test(region.name)) return region.name;
    return villageWord(region.code) + region.name;
  }
  return region.name;
}

/**
 * The administrative parts, innermost first — kelurahan, kecamatan,
 * kabupaten/kota, provinsi. The legend prints one per line, so they are kept
 * apart rather than pre-joined.
 */
export function regionLines(chain: Region[]): string[] {
  return chain
    .filter(Boolean)
    .slice()
    .sort((a, b) => b.level - a.level)
    .map(decorate);
}

/** The same parts on one line, for places too narrow to list them. */
export function regionLabel(chain: Region[]): string {
  return regionLines(chain).join(", ");
}

/** Ancestor codes of "32.75.01.1001" → ["32", "32.75", "32.75.01"]. */
export function ancestorCodes(code: string): string[] {
  const parts = code.split(".");
  return parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join("."));
}
