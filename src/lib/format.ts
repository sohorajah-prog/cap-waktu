/**
 * Every layout is offered twice: to the minute, and to the second. Field
 * documentation often needs the exact second, so it is a first-class choice
 * rather than a single odd entry in the list.
 */
export const DATE_FORMAT_GROUPS = [
  {
    label: "Sampai menit",
    formats: [
      "DD/MM/YYYY HH:mm",
      "DD MMMM YYYY, HH:mm",
      "DDD, DD MMM YYYY HH:mm",
      "YYYY-MM-DD HH:mm",
    ],
  },
  {
    label: "Sampai detik",
    formats: [
      "DD/MM/YYYY HH:mm:ss",
      "DD MMMM YYYY, HH:mm:ss",
      "DDD, DD MMM YYYY HH:mm:ss",
      "YYYY-MM-DD HH:mm:ss",
      "DD/MM/YYYY HH:mm:ss Z",
    ],
  },
] as const;

export const DATE_FORMATS = DATE_FORMAT_GROUPS.flatMap((g) => g.formats);

export type DateFormat = (typeof DATE_FORMATS)[number];

/** Fixed date behind the dropdown previews, so server and client agree. */
export const SAMPLE_DATE = new Date(2026, 7, 20, 14, 32, 7);

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

/**
 * Indonesia spans three time zones, so the label is read off the device rather
 * than assumed. Anywhere else falls back to the numeric UTC offset.
 */
export function timeZoneLabel(date: Date): string {
  const offset = -date.getTimezoneOffset();
  if (offset === 420) return "WIB";
  if (offset === 480) return "WITA";
  if (offset === 540) return "WIT";
  const sign = offset < 0 ? "-" : "+";
  const abs = Math.abs(offset);
  return `UTC${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

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
    .replace("ss", pad(date.getSeconds()))
    .replace("Z", timeZoneLabel(date));
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
