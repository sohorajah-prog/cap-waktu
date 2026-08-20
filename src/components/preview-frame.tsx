"use client";

import { useEffect, useRef } from "react";
import {
  drawLegend,
  fontsReady,
  legendParts,
  type LegendParts,
  type StampSettings,
} from "@/lib/stamp";
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
  const parts = at ? legendParts(settings, at) : null;
  const pos = settings.legendPosition;
  const onTop = pos === "atas";

  return (
    <div className="relative flex aspect-[16/10] flex-col p-5 sm:p-8">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(to_right,var(--citrus)_1px,transparent_1px),linear-gradient(to_bottom,var(--citrus)_1px,transparent_1px)] [background-size:44px_44px]"
      />

      {onTop ? <MockLegend parts={parts} position={pos} /> : null}

      <div className="relative my-auto">
        <p className="label-eyebrow text-citrus/70">Belum ada gambar</p>
      </div>

      {onTop ? null : <MockLegend parts={parts} position={pos} />}
    </div>
  );
}

/** A rough stand-in for the canvas legend, in the same arrangement. */
function MockLegend({
  parts,
  position,
}: {
  parts: LegendParts | null;
  position: StampSettings["legendPosition"];
}) {
  const band = position === "atas" || position === "bawah";
  const alignRight = position === "kanan";

  return (
    <div
      className={cn(
        "relative flex transition-all duration-300 ease-out",
        position === "kiri" && "justify-start",
        alignRight && "justify-end",
      )}
    >
      <div
        className={cn(
          "px-1 text-white",
          band ? "w-full" : "max-w-[86%]",
          alignRight && "text-right",
        )}
        style={{ textShadow: "0 1px 4px rgba(0,0,0,.8)" }}
      >
        <div
          className={cn(
            "flex items-center gap-2.5",
            alignRight && "flex-row-reverse",
          )}
        >
          <span className="tnum font-mono text-[clamp(1.5rem,5vw,2.6rem)] font-bold leading-none">
            {parts ? parts.time : "--:--"}
          </span>
          <span aria-hidden className="h-9 w-[3px] shrink-0 bg-citrus" />
          <span className="leading-tight">
            <span className="block font-mono text-[0.7rem]">
              {parts ? parts.date : ""}
            </span>
            <span className="block font-mono text-[0.7rem] text-white/75">
              {parts ? parts.day : ""}
            </span>
          </span>
        </div>

        <p className="mt-2 font-mono text-[0.66rem] leading-relaxed text-white/85">
          {parts?.address || "Alamat akan tampil di sini"}
        </p>

        {parts?.coords ? (
          <>
            <span aria-hidden className="mt-2 block h-px w-full bg-white/35" />
            <p className="tnum mt-1.5 font-mono text-[0.6rem] text-white/70">
              {parts.coords}
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
