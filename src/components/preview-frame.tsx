"use client";

import { useEffect, useRef } from "react";
import { drawLegend, fontsReady, legendLines, type StampSettings } from "@/lib/stamp";
import { formatStamp } from "@/lib/format";
import { cn } from "@/lib/utils";

const PREVIEW_MAX = 1600;

export function PreviewFrame({
  image,
  settings,
  at,
  className,
}: {
  image: HTMLImageElement | null;
  settings: StampSettings;
  at: Date | null;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image || !at) return;
    let cancelled = false;

    const paint = () => {
      if (cancelled) return;
      const ratio = Math.min(1, PREVIEW_MAX / image.naturalWidth);
      canvas.width = Math.round(image.naturalWidth * ratio);
      canvas.height = Math.round(image.naturalHeight * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      drawLegend({ ctx, width: canvas.width, height: canvas.height, settings, at });
    };

    paint();
    // Repaint once the webfaces land, so the preview matches the download.
    fontsReady().then(paint);
    return () => {
      cancelled = true;
    };
  }, [image, settings, at]);

  return (
    <figure className={cn("space-y-3", className)}>
      {/* Neatline: the frame is read like a map sheet, ticks and all. */}
      <div className="relative border border-ink bg-ink p-[7px]">
        <Ticks />
        <div className="relative overflow-hidden bg-[#08171f]">
          {image && at ? (
            <canvas
              ref={canvasRef}
              className="block h-auto w-full"
              aria-label="Pratinjau gambar dengan legenda"
            />
          ) : (
            <EmptyStage settings={settings} at={at} />
          )}
        </div>
      </div>

      <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span className="label-eyebrow text-ink-45">Pratinjau langsung</span>
        <span className="tnum font-mono text-[0.66rem] text-ink-45">
          {image ? image.naturalWidth + " × " + image.naturalHeight + " px" : "menunggu gambar"}
        </span>
      </figcaption>
    </figure>
  );
}

function Ticks() {
  const edge =
    "absolute bg-[repeating-linear-gradient(var(--dir),color-mix(in_oklab,var(--citrus)_55%,transparent)_0_1px,transparent_1px_14px)]";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <span
        className={cn(edge, "left-0 right-0 top-[2px] h-[4px]")}
        style={{ ["--dir" as string]: "to right" }}
      />
      <span
        className={cn(edge, "bottom-[2px] left-0 right-0 h-[4px]")}
        style={{ ["--dir" as string]: "to right" }}
      />
      <span
        className={cn(edge, "bottom-0 left-[2px] top-0 w-[4px]")}
        style={{ ["--dir" as string]: "to bottom" }}
      />
      <span
        className={cn(edge, "bottom-0 right-[2px] top-0 w-[4px]")}
        style={{ ["--dir" as string]: "to bottom" }}
      />
    </div>
  );
}

/**
 * Before a photo exists, the frame proves the point on its own: the clock
 * runs, and the legend already sits where it will print.
 */
function EmptyStage({ settings, at }: { settings: StampSettings; at: Date | null }) {
  const lines = at ? legendLines(settings, at) : [];
  const pos = settings.legendPosition;
  const onTop = pos === "atas";

  return (
    <div className="relative flex aspect-[16/10] flex-col p-5 sm:p-8">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(to_right,var(--citrus)_1px,transparent_1px),linear-gradient(to_bottom,var(--citrus)_1px,transparent_1px)] [background-size:44px_44px]"
      />

      {onTop ? <MockLegend lines={lines} position={pos} /> : null}

      <div className="relative my-auto">
        <p className="label-eyebrow mb-3 text-citrus/70">Belum ada gambar</p>
        <p className="tnum font-mono text-[clamp(2rem,7vw,4.4rem)] font-bold leading-[0.95] text-citrus">
          {at ? formatStamp(at, "HH:mm:ss") : "--:--:--"}
        </p>
        <p className="mt-2 font-mono text-[0.68rem] tracking-[0.14em] text-white/45">
          {at ? formatStamp(at, "DDD, DD MMMM YYYY") : ""}
        </p>
      </div>

      {onTop ? null : <MockLegend lines={lines} position={pos} />}
    </div>
  );
}

function MockLegend({
  lines,
  position,
}: {
  lines: string[];
  position: StampSettings["legendPosition"];
}) {
  const edgeBar = position === "atas" || position === "bawah";
  return (
    <div
      className={cn(
        "relative flex transition-all duration-300 ease-out",
        position === "kiri" && "justify-start",
        position === "kanan" && "justify-end",
      )}
    >
      <div className={cn(edgeBar ? "w-full" : "max-w-[78%]")}>
        <div className="h-[3px] w-full bg-citrus" />
        <div className="bg-black/45 px-3 py-2.5">
          {(lines.length ? lines : ["Nama lokasi akan tampil di sini"]).map((line, i) => (
            <p key={i} className="tnum font-mono text-[0.64rem] leading-relaxed text-white/80">
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
