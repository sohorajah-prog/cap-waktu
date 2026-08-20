"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowRight, RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  clearHistory,
  dismissError,
  historyStore,
  loadHistory,
  removeResult,
  type ResultDTO,
} from "@/lib/history";
import { formatCoords, formatStamp } from "@/lib/format";
import { FONT_COLORS, FONT_FAMILIES, LEGEND_POSITIONS } from "@/lib/stamp";

export function HistoryBoard() {
  const [open, setOpen] = useState<ResultDTO | null>(null);
  const { status, results, error } = useSyncExternalStore(
    historyStore.subscribe,
    historyStore.getSnapshot,
    historyStore.getServerSnapshot,
  );

  useEffect(() => {
    void loadHistory();
  }, []);

  const settled = status === "ready" || status === "error";

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-rule-firm pb-5">
        <div>
          <p className="label-eyebrow mb-2 text-ink-45">Lembar kontak</p>
          <h1 className="font-display text-[clamp(1.7rem,3.4vw,2.4rem)] font-extrabold uppercase leading-none">
            Riwayat hasil
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="tnum font-mono text-[0.7rem] text-ink-45">
            {settled ? results.length + " hasil tersimpan" : "memuat"}
          </span>
          {results.length > 0 ? (
            <Button size="sm" variant="ghost" onClick={() => void clearHistory()}>
              <Trash2 size={13} /> Kosongkan
            </Button>
          ) : null}
        </div>
      </header>

      {/* A failed load replaces the sheet; a failed action sits above it so the
          results stay visible. */}
      {error && status !== "error" ? (
        <div
          role="alert"
          className="mb-6 flex flex-wrap items-center gap-4 border-l-2 border-magenta bg-magenta-wash px-4 py-3"
        >
          <p className="flex-1 text-sm leading-relaxed text-ink">{error}</p>
          <Button size="sm" variant="ghost" onClick={dismissError}>
            Tutup
          </Button>
        </div>
      ) : null}

      {status === "error" ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-4 border-l-2 border-magenta bg-magenta-wash px-4 py-3"
        >
          <p className="flex-1 text-sm leading-relaxed text-ink">{error}</p>
          <Button size="sm" onClick={() => void loadHistory(true)}>
            <RotateCcw size={13} /> Muat ulang
          </Button>
        </div>
      ) : !settled ? null : results.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((entry, i) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => setOpen(entry)}
                className="group block w-full text-left"
              >
                <div className="relative border border-ink bg-ink p-[5px]">
                  {/* Resized by the image optimizer — a contact sheet must not
                      pull down full-resolution photos. */}
                  <Image
                    src={entry.imageUrl}
                    alt={entry.settings.locationName || entry.fileName}
                    width={entry.width}
                    height={entry.height}
                    sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
                    className="block h-auto w-full transition-opacity duration-200 group-hover:opacity-85"
                  />
                  <span className="tnum absolute -top-px left-2 bg-ink px-1.5 py-0.5 font-mono text-[0.58rem] font-bold text-citrus">
                    {String(results.length - i).padStart(3, "0")}
                  </span>
                </div>
                <div className="mt-2.5 space-y-1">
                  <p className="truncate font-display text-[0.9rem] font-bold leading-snug group-hover:text-cerulean">
                    {entry.settings.locationName || "Tanpa nama lokasi"}
                  </p>
                  <p className="tnum font-mono text-[0.64rem] text-ink-70">
                    {formatStamp(new Date(entry.stampedAt), "DD/MM/YYYY HH:mm")}
                  </p>
                  <p className="tnum truncate font-mono text-[0.62rem] text-ink-45">
                    {formatCoords(entry.settings.latitude, entry.settings.longitude) ||
                      "tanpa koordinat"}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <DetailDialog
          entry={open}
          onClose={() => setOpen(null)}
          onRemove={() => {
            void removeResult(open.id);
            setOpen(null);
          }}
        />
      ) : null}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border border-dashed border-rule-firm bg-card px-6 py-16 text-center">
      <p className="mx-auto mb-1 max-w-[38ch] font-display text-lg font-bold uppercase">
        Belum ada hasil di sini
      </p>
      <p className="mx-auto mb-6 max-w-[46ch] text-sm leading-relaxed text-ink-70">
        Setiap gambar yang Anda unduh langsung tercatat di lembar ini, lengkap dengan
        lokasi, koordinat, dan waktunya.
      </p>
      <Link
        href="/"
        className="inline-flex h-11 items-center gap-2 bg-magenta px-5 font-display text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-magenta-deep"
      >
        Buat cap waktu pertama <ArrowRight size={16} />
      </Link>
    </div>
  );
}

function DetailDialog({
  entry,
  onClose,
  onRemove,
}: {
  entry: ResultDTO;
  onClose: () => void;
  onRemove: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const rows: [string, string][] = [
    ["Detail tempat", entry.settings.locationName || "—"],
    ["Wilayah", entry.settings.regionLabel || "—"],
    [
      "Koordinat",
      formatCoords(entry.settings.latitude, entry.settings.longitude) || "—",
    ],
    ["Waktu cap", formatStamp(new Date(entry.stampedAt), "DDD, DD MMMM YYYY, HH:mm:ss")],
    ["Disimpan", formatStamp(new Date(entry.createdAt), "DD/MM/YYYY HH:mm:ss")],
    ["Format tanggal", entry.settings.dateFormat],
    [
      "Posisi legenda",
      LEGEND_POSITIONS.find((p) => p.value === entry.settings.legendPosition)?.label ?? "—",
    ],
    [
      "Gaya teks",
      FONT_FAMILIES.find((f) => f.value === entry.settings.fontFamily)?.label +
        " · " +
        entry.settings.fontSize +
        " px · " +
        (FONT_COLORS.find((c) => c.value === entry.settings.fontColor)?.label ??
          entry.settings.fontColor),
    ],
    ["Berkas asal", entry.fileName || "—"],
    ["Ukuran", entry.width + " × " + entry.height + " px"],
  ];

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      className="m-auto w-[min(940px,92vw)] border border-ink bg-paper p-0 text-ink backdrop:bg-ink/55"
    >
      <div className="flex items-center gap-3 border-b border-rule-firm px-4 py-3">
        <span className="label-eyebrow text-ink-45">Detail riwayat</span>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label="Tutup detail"
          className="ml-auto text-ink-45 transition-colors hover:text-ink"
        >
          <X size={18} />
        </button>
      </div>

      <div className="grid gap-6 p-4 sm:p-6 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="self-start border border-ink bg-ink p-[6px]">
          <Image
            src={entry.imageUrl}
            alt={entry.settings.locationName || entry.fileName}
            width={entry.width}
            height={entry.height}
            sizes="(min-width: 768px) 520px, 90vw"
            className="block h-auto w-full"
          />
        </div>

        <div>
          <dl className="divide-y divide-rule border-y border-rule">
            {rows.map(([term, value]) => (
              <div key={term} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 py-2.5">
                <dt className="label-eyebrow pt-0.5 text-ink-45">{term}</dt>
                <dd className="tnum break-words font-mono text-[0.72rem] leading-relaxed text-ink">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href={entry.imageUrl}
              download
              className="inline-flex h-9 items-center gap-2 border border-rule-firm bg-card px-3 font-display text-[0.72rem] font-semibold uppercase tracking-wide transition-colors hover:border-ink"
            >
              Unduh lagi
            </a>
            <a
              href={entry.originalUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 border border-rule-firm bg-card px-3 font-display text-[0.72rem] font-semibold uppercase tracking-wide transition-colors hover:border-ink"
            >
              Lihat gambar asli
            </a>
            <Button size="sm" variant="ghost" onClick={onRemove}>
              <Trash2 size={13} /> Hapus dari riwayat
            </Button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
