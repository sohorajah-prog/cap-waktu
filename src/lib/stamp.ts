import { findFormat, formatCoords, formatStamp } from "./format";

export const LEGEND_POSITIONS = [
  { value: "bawah", label: "Bawah" },
  { value: "atas", label: "Atas" },
  { value: "kiri", label: "Kiri" },
  { value: "kanan", label: "Kanan" },
] as const;
export type LegendPosition = (typeof LEGEND_POSITIONS)[number]["value"];

export const FONT_FAMILIES = [
  {
    value: "android",
    label: "Android (Roboto)",
    cssVar: "--font-roboto",
    fallback: "Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  {
    /**
     * Apple does not license SF Pro for embedding, so this renders as the real
     * thing on Apple devices and falls back to Helvetica elsewhere.
     */
    value: "ios",
    label: "iOS (SF Pro)",
    cssVar: "",
    fallback:
      "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', " +
      "'Helvetica Neue', Helvetica, Arial, sans-serif",
  },
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
  /** Keterangan bebas: nama gudang, patok, atau ruas jalan. */
  locationName: string;
  regionCode: string | null;
  /**
   * Wilayah administratif, terdalam lebih dulu: kelurahan, kecamatan,
   * kabupaten/kota, provinsi. Satu unsur satu baris pada legenda.
   */
  regionLines: string[];
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
  regionCode: null,
  regionLines: [],
  latitude: null,
  longitude: null,
  dateFormat: "DD MMMM YYYY, HH:mm",
  legendPosition: "bawah",
  fontSize: 26,
  fontColor: "#ffffff",
  fontFamily: "android",
  showPlate: false,
};

export type LegendParts = {
  /** The large clock. */
  time: string;
  date: string;
  day: string;
  /** Detail and region running together as one flowing address. */
  address: string;
  coords: string;
};

/**
 * The legend's content, split by the role each piece plays in the layout
 * rather than by one line each: the clock stands alone, the date and weekday
 * sit beside it, and every place name runs together as an address.
 */
export function legendParts(settings: StampSettings, at: Date): LegendParts {
  const format = findFormat(settings.dateFormat);
  const address = [settings.locationName.trim(), ...settings.regionLines]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");

  return {
    time: formatStamp(at, format.time),
    date: formatStamp(at, format.date),
    day: formatStamp(at, "DDDD"),
    address,
    coords: formatCoords(settings.latitude, settings.longitude),
  };
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
 * Breaks a line that is too wide onto further lines at word boundaries.
 * A line such as "Kecamatan …" or a long detail note routinely runs past
 * the edge of a portrait photo, and clipped evidence is worse than none.
 */
function wrap(ctx: CanvasRenderingContext2D, line: string, maxWidth: number): string[] {
  if (ctx.measureText(line).width <= maxWidth) return [line];

  const words = line.split(" ");
  const out: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? current + " " + word : word;
    if (current && ctx.measureText(candidate).width > maxWidth) {
      out.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) out.push(current);
  return out;
}

/** Every measurement below is a multiple of the body size, so the whole block
 *  scales together with the size slider and with the photo's resolution. */
function metricsFor(body: number) {
  return {
    body,
    clock: body * 2.6,
    meta: body * 0.92,
    foot: body * 0.86,
    padX: body * 1.15,
    padY: body * 1.0,
    /** Gap on each side of the gold divider. */
    dividerGap: body * 0.62,
    dividerWidth: Math.max(2, body * 0.14),
    metaLine: body * 1.28,
    bodyLine: body * 1.32,
    footLine: body * 1.3,
    gapHeadToAddress: body * 0.85,
    gapAddressToRule: body * 0.8,
    gapRuleToFoot: body * 0.62,
    hairline: Math.max(1, body * 0.045),
  };
}

const weight = {
  clock: 700,
  meta: 500,
  body: 500,
  foot: 500,
} as const;

/**
 * Paints the legend onto an already-drawn image, in the arrangement of the
 * reference: a large clock, a gold divider, the date and weekday stacked
 * beside it, the address running underneath, then a hairline and the
 * coordinates.
 *
 * All metrics scale off image width so a 4000px photo and a 600px preview
 * produce visually identical output.
 */
export function drawLegend({ ctx, width, height, settings, at }: DrawArgs) {
  const parts = legendParts(settings, at);
  const scale = width / REFERENCE_WIDTH;
  const m = metricsFor(Math.max(7, settings.fontSize * scale));
  const stack = fontStack(settings.fontFamily);

  const font = (size: number, w: number) => `${w} ${size}px ${stack}`;
  const measure = (text: string, size: number, w: number) => {
    ctx.font = font(size, w);
    return ctx.measureText(text).width;
  };

  ctx.save();
  ctx.textBaseline = "top";

  // ── Head: clock | divider | date over weekday ──────────────────────────
  const timeW = measure(parts.time, m.clock, weight.clock);
  const metaW = Math.max(
    measure(parts.date, m.meta, weight.meta),
    measure(parts.day, m.meta, weight.meta),
  );
  const headW = timeW + m.dividerGap + m.dividerWidth + m.dividerGap + metaW;
  const headH = Math.max(m.clock * 0.94, m.metaLine * 2);

  // ── Body: the address, wrapped ────────────────────────────────────────
  const sideBlock =
    settings.legendPosition === "kiri" || settings.legendPosition === "kanan";
  let contentBudget = (sideBlock ? width * 0.86 : width) - m.padX * 2;

  ctx.font = font(m.body, weight.body);
  let addressLines = parts.address ? wrap(ctx, parts.address, contentBudget) : [];
  ctx.font = font(m.foot, weight.foot);
  let footLines = parts.coords ? wrap(ctx, parts.coords, contentBudget) : [];

  const widest = () =>
    Math.max(
      headW,
      ...addressLines.map((l) => measure(l, m.body, weight.body)),
      ...footLines.map((l) => measure(l, m.foot, weight.foot)),
    );

  // A side block wider than the photo becomes a full-width band rather than
  // running off the edge.
  let isBand = !sideBlock;
  if (sideBlock && widest() + m.padX * 2 > width - m.body) {
    isBand = true;
    contentBudget = width - m.padX * 2;
    ctx.font = font(m.body, weight.body);
    addressLines = parts.address ? wrap(ctx, parts.address, contentBudget) : [];
    ctx.font = font(m.foot, weight.foot);
    footLines = parts.coords ? wrap(ctx, parts.coords, contentBudget) : [];
  }

  const blockW = isBand ? width : Math.min(width, widest() + m.padX * 2);
  const blockH =
    m.padY +
    headH +
    (addressLines.length ? m.gapHeadToAddress + addressLines.length * m.bodyLine : 0) +
    (footLines.length
      ? m.gapAddressToRule + m.hairline + m.gapRuleToFoot + footLines.length * m.footLine
      : 0) +
    m.padY;

  let x = 0;
  let y = settings.legendPosition === "atas" ? 0 : height - blockH;
  if (!isBand) {
    y = height - blockH - m.body * 0.6;
    x =
      settings.legendPosition === "kiri"
        ? m.body * 0.6
        : width - blockW - m.body * 0.6;
  }

  const alignRight = settings.legendPosition === "kanan";
  const left = x + m.padX;
  const right = x + blockW - m.padX;

  if (settings.showPlate) {
    ctx.fillStyle = "rgba(12, 35, 51, 0.55)";
    ctx.fillRect(x, y, blockW, blockH);
  } else {
    // The reference sets its text straight on the photo; a shadow is what
    // keeps it readable over a bright sky.
    ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
    ctx.shadowBlur = m.body * 0.42;
    ctx.shadowOffsetY = m.body * 0.07;
  }

  let cursor = y + m.padY;

  // Head row. Mirrored when the block hugs the right edge.
  const headLeft = alignRight ? right - headW : left;
  const timeX = alignRight ? headLeft + metaW + m.dividerGap * 2 + m.dividerWidth : headLeft;
  const dividerX = alignRight
    ? headLeft + metaW + m.dividerGap
    : headLeft + timeW + m.dividerGap;
  const metaX = alignRight ? headLeft + metaW : dividerX + m.dividerWidth + m.dividerGap;

  ctx.fillStyle = settings.fontColor;
  ctx.textAlign = "left";
  ctx.font = font(m.clock, weight.clock);
  ctx.fillText(parts.time, timeX, cursor);

  ctx.textAlign = alignRight ? "right" : "left";
  ctx.font = font(m.meta, weight.meta);
  const metaTop = cursor + (headH - m.metaLine * 2) / 2;
  ctx.fillText(parts.date, metaX, metaTop + m.metaLine * 0.06);
  ctx.fillText(parts.day, metaX, metaTop + m.metaLine);

  // Gold divider, the one mark carried over from the app's own palette.
  ctx.fillStyle = "#d6d871";
  ctx.fillRect(dividerX, cursor + headH * 0.04, m.dividerWidth, headH * 0.9);

  cursor += headH;

  ctx.fillStyle = settings.fontColor;
  ctx.textAlign = alignRight ? "right" : "left";
  const textX = alignRight ? right : left;

  if (addressLines.length) {
    cursor += m.gapHeadToAddress;
    ctx.font = font(m.body, weight.body);
    addressLines.forEach((line, i) => {
      ctx.fillText(line, textX, cursor + i * m.bodyLine);
    });
    cursor += addressLines.length * m.bodyLine;
  }

  if (footLines.length) {
    cursor += m.gapAddressToRule;
    const previousAlpha = ctx.globalAlpha;
    ctx.globalAlpha = previousAlpha * 0.45;
    ctx.fillRect(left, cursor, right - left, m.hairline);
    ctx.globalAlpha = previousAlpha;
    cursor += m.hairline + m.gapRuleToFoot;

    ctx.font = font(m.foot, weight.foot);
    footLines.forEach((line, i) => {
      ctx.fillText(line, textX, cursor + i * m.footLine);
    });
  }

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

