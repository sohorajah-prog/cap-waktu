import { formatCoords, formatStamp } from "./format";

export const LEGEND_POSITIONS = [
  { value: "bawah", label: "Bawah" },
  { value: "atas", label: "Atas" },
  { value: "kiri", label: "Kiri" },
  { value: "kanan", label: "Kanan" },
] as const;
export type LegendPosition = (typeof LEGEND_POSITIONS)[number]["value"];

export const FONT_FAMILIES = [
  { value: "sans", label: "Sans", cssVar: "--font-public-sans", fallback: "Arial, sans-serif" },
  { value: "mono", label: "Mono", cssVar: "--font-martian-mono", fallback: "ui-monospace, monospace" },
  { value: "serif", label: "Serif", cssVar: "", fallback: "Georgia, 'Times New Roman', serif" },
] as const;
export type FontFamilyKey = (typeof FONT_FAMILIES)[number]["value"];

/**
 * next/font mangles family names at build time, so the canvas has to read the
 * real name back off the CSS variable instead of hard-coding it.
 */
function fontStack(key: FontFamilyKey): string {
  const family = FONT_FAMILIES.find((f) => f.value === key)!;
  if (!family.cssVar) return family.fallback;
  const resolved = getComputedStyle(document.documentElement)
    .getPropertyValue(family.cssVar)
    .trim();
  return resolved ? resolved + ", " + family.fallback : family.fallback;
}

/** Waits until the webfaces are usable, so the first draw is never a fallback. */
export async function fontsReady(): Promise<void> {
  if (typeof document !== "undefined" && "fonts" in document) {
    await document.fonts.ready;
  }
}

export const FONT_COLORS = [
  { value: "#ffffff", label: "Putih" },
  { value: "#d6d871", label: "Citrus" },
  { value: "#218dc2", label: "Cerulean" },
  { value: "#df2489", label: "Magenta" },
  { value: "#0c2333", label: "Tinta" },
] as const;

export type StampSettings = {
  locationName: string;
  latitude: number | null;
  longitude: number | null;
  dateFormat: string;
  legendPosition: LegendPosition;
  /** Cap height in px, measured against a 1080px-wide reference image. */
  fontSize: number;
  fontColor: string;
  fontFamily: FontFamilyKey;
  showPlate: boolean;
};

export const DEFAULT_SETTINGS: StampSettings = {
  locationName: "",
  latitude: null,
  longitude: null,
  dateFormat: "DD/MM/YYYY HH:mm",
  legendPosition: "bawah",
  fontSize: 26,
  fontColor: "#ffffff",
  fontFamily: "sans",
  showPlate: true,
};

/** The legend text, in reading order: place, then coordinates, then moment. */
export function legendLines(settings: StampSettings, at: Date): string[] {
  const lines: string[] = [];
  if (settings.locationName.trim()) lines.push(settings.locationName.trim());
  const coords = formatCoords(settings.latitude, settings.longitude);
  if (coords) lines.push(coords);
  lines.push(formatStamp(at, settings.dateFormat));
  return lines;
}

const REFERENCE_WIDTH = 1080;

type DrawArgs = {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  settings: StampSettings;
  at: Date;
};

/**
 * Paints the legend onto an already-drawn image.
 * All metrics scale off image width so a 4000px photo and a 600px preview
 * produce visually identical output.
 */
export function drawLegend({ ctx, width, height, settings, at }: DrawArgs) {
  const lines = legendLines(settings, at);
  if (lines.length === 0) return;

  const scale = width / REFERENCE_WIDTH;
  const size = Math.max(8, settings.fontSize * scale);
  const lineHeight = size * 1.42;
  const padX = size * 0.9;
  const padY = size * 0.72;
  const stack = fontStack(settings.fontFamily);
  let isEdgeBar =
    settings.legendPosition === "atas" || settings.legendPosition === "bawah";

  ctx.save();
  ctx.textBaseline = "top";
  ctx.font = `500 ${size}px ${stack}`;

  const textWidth = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const blockH = lines.length * lineHeight - (lineHeight - size) + padY * 2;
  let blockW = isEdgeBar ? width : textWidth + padX * 2;
  // A side block wider than the photo becomes a full-width bar rather than
  // running the text off the edge.
  if (!isEdgeBar && blockW > width - size) {
    isEdgeBar = true;
    blockW = width;
  }

  let x = 0;
  let y = 0;
  if (settings.legendPosition === "atas") y = 0;
  else if (isEdgeBar) y = height - blockH;
  else {
    y = height - blockH - size * 0.6;
    x = settings.legendPosition === "kiri" ? size * 0.6 : width - blockW - size * 0.6;
  }

  if (settings.showPlate) {
    ctx.fillStyle = "rgba(12, 35, 51, 0.62)";
    ctx.fillRect(x, y, blockW, blockH);
    // Citrus keyline on the leading edge — the app's one signature mark.
    ctx.fillStyle = "#d6d871";
    const keyline = Math.max(2, size * 0.11);
    if (settings.legendPosition === "atas") ctx.fillRect(x, y + blockH - keyline, blockW, keyline);
    else if (isEdgeBar) ctx.fillRect(x, y, blockW, keyline);
    else ctx.fillRect(x, y, keyline, blockH);
  } else {
    ctx.shadowColor = "rgba(0, 0, 0, 0.72)";
    ctx.shadowBlur = size * 0.35;
    ctx.shadowOffsetY = size * 0.06;
  }

  ctx.fillStyle = settings.fontColor;
  const textX = x + padX + (settings.showPlate && !isEdgeBar ? size * 0.2 : 0);
  lines.forEach((line, i) => {
    ctx.fillText(line, textX, y + padY + i * lineHeight);
  });
  ctx.restore();
}

/** Renders image + legend at full source resolution. */
export async function renderStamped(
  image: HTMLImageElement,
  settings: StampSettings,
  at: Date,
): Promise<HTMLCanvasElement> {
  await fontsReady();
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, 0, 0);
  drawLegend({ ctx, width: canvas.width, height: canvas.height, settings, at });
  return canvas;
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: "jpg" | "png",
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Gagal membuat berkas gambar."))),
      format === "png" ? "image/png" : "image/jpeg",
      format === "png" ? undefined : 0.92,
    );
  });
}

