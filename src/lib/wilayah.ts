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

/** Prefixes the source data leaves off, so a stamp reads unambiguously. */
function decorate(region: Region): string {
  if (region.level === 3) return "Kec. " + region.name;
  if (region.level === 4) return "Kel./Desa " + region.name;
  return region.name;
}

/**
 * Builds the legend line, innermost first — how an Indonesian address is read
 * aloud: "Kel./Desa Margahayu, Kec. Bekasi Timur, Kota Bekasi, Jawa Barat".
 */
export function regionLabel(chain: Region[]): string {
  return chain
    .filter(Boolean)
    .slice()
    .sort((a, b) => b.level - a.level)
    .map(decorate)
    .join(", ");
}

/** Ancestor codes of "32.75.01.1001" → ["32", "32.75", "32.75.01"]. */
export function ancestorCodes(code: string): string[] {
  const parts = code.split(".");
  return parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join("."));
}
