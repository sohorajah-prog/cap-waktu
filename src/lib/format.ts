export const DATE_FORMATS = [
  { value: "DD/MM/YYYY HH:mm", label: "20/08/2026 14:32" },
  { value: "DD/MM/YYYY HH:mm:ss", label: "20/08/2026 14:32:07" },
  { value: "DD MMMM YYYY, HH:mm", label: "20 Agustus 2026, 14:32" },
  { value: "DDD, DD MMM YYYY HH:mm", label: "Kam, 20 Agu 2026 14:32" },
  { value: "YYYY-MM-DD HH:mm", label: "2026-08-20 14:32" },
] as const;

export type DateFormat = (typeof DATE_FORMATS)[number]["value"];

const MONTHS_LONG = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];
const DAYS_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const pad = (n: number) => String(n).padStart(2, "0");

/** Renders a date with the patterns the app exposes. Not a general formatter. */
export function formatStamp(date: Date, pattern: string): string {
  return pattern
    .replace("DDD", DAYS_SHORT[date.getDay()])
    .replace("MMMM", MONTHS_LONG[date.getMonth()])
    .replace("MMM", MONTHS_SHORT[date.getMonth()])
    .replace("YYYY", String(date.getFullYear()))
    .replace("DD", pad(date.getDate()))
    .replace("MM", pad(date.getMonth() + 1))
    .replace("HH", pad(date.getHours()))
    .replace("mm", pad(date.getMinutes()))
    .replace("ss", pad(date.getSeconds()));
}

/** Decimal degrees with hemisphere letters — how field notes write coordinates. */
export function formatCoords(lat: number | null, lon: number | null): string {
  if (lat === null || lon === null) return "";
  const ns = lat >= 0 ? "LU" : "LS";
  const ew = lon >= 0 ? "BT" : "BB";
  return `${Math.abs(lat).toFixed(6)}° ${ns}  ${Math.abs(lon).toFixed(6)}° ${ew}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
