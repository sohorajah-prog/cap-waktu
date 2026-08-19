"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  Crosshair,
  Download,
  ImagePlus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, SegmentedControl, SelectInput, TextInput } from "@/components/ui/field";
import { PreviewFrame } from "@/components/preview-frame";
import { StepHeading } from "@/components/step-heading";
import { useNow } from "@/components/live-clock";
import { DATE_FORMATS, formatCoords, formatStamp } from "@/lib/format";
import { saveResult } from "@/lib/history";
import {
  canvasToBlob,
  DEFAULT_SETTINGS,
  FONT_COLORS,
  FONT_FAMILIES,
  LEGEND_POSITIONS,
  renderStamped,
  type StampSettings,
} from "@/lib/stamp";
import { cn } from "@/lib/utils";

type GpsState = "idle" | "loading" | "ready" | "error";

export function StampStudio() {
  const [settings, setSettings] = useState<StampSettings>(DEFAULT_SETTINGS);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  // The original File is kept so the saved result can be traced back to it.
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [stampedAt, setStampedAt] = useState<Date | null>(null);
  const [gps, setGps] = useState<GpsState>("idle");
  const [gpsMessage, setGpsMessage] = useState("");
  const [format, setFormat] = useState<"jpg" | "png">("jpg");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");
  const [saveError, setSaveError] = useState("");

  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const objectUrl = useRef<string | null>(null);

  // Before a photo exists the frame runs a live clock. Once one is loaded the
  // time freezes at the moment of upload, so the stamp records a real moment.
  const liveNow = useNow(!image);
  const at = image ? stampedAt : liveNow;

  const patch = useCallback(
    (next: Partial<StampSettings>) => setSettings((s) => ({ ...s, ...next })),
    [],
  );

  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );

  const loadFile = (file: File | undefined) => {
    if (!file) return;
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    const url = URL.createObjectURL(file);
    objectUrl.current = url;
    const img = new Image();
    img.onload = () => {
      setImage(img);
      setSourceFile(file);
      setFileName(file.name);
      setStampedAt(new Date(file.lastModified || Date.now()));
      setSaved("");
    };
    img.src = url;
  };

  const clearImage = () => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
    setImage(null);
    setSourceFile(null);
    setFileName("");
    setStampedAt(null);
    setSaved("");
  };

  const requestGps = () => {
    if (!("geolocation" in navigator)) {
      setGps("error");
      setGpsMessage("Perangkat ini tidak menyediakan GPS. Isi koordinat secara manual.");
      return;
    }
    setGps("loading");
    setGpsMessage("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        patch({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setGps("ready");
        setGpsMessage("Akurasi " + Math.round(pos.coords.accuracy) + " m");
      },
      (err) => {
        setGps("error");
        setGpsMessage(
          err.code === err.PERMISSION_DENIED
            ? "Izin lokasi ditolak. Aktifkan izin lokasi di browser, atau isi koordinat manual."
            : "Koordinat belum terbaca. Coba lagi di area terbuka, atau isi koordinat manual.",
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

  const clearCoords = () => {
    patch({ latitude: null, longitude: null });
    setGps("idle");
    setGpsMessage("");
  };

  const download = async () => {
    if (!image || !at || !sourceFile) return;
    setSaving(true);
    setSaveError("");
    try {
      const canvas = await renderStamped(image, settings, at);
      const blob = await canvasToBlob(canvas, format);
      const slug =
        settings.locationName
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") || "cap-waktu";
      const name = slug + "-" + formatStamp(at, "YYYYMMDD-HHmmss") + "." + format;

      // The download happens first and unconditionally: the user gets their
      // file even if the history save later fails.
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = name;
      link.click();
      URL.revokeObjectURL(link.href);
      setSaved(name);

      const body = new FormData();
      body.append("original", sourceFile, sourceFile.name || "foto");
      body.append("result", blob, name);
      body.append(
        "settings",
        JSON.stringify({
          ...settings,
          latitude: settings.latitude === null ? null : String(settings.latitude),
          longitude: settings.longitude === null ? null : String(settings.longitude),
          format,
          width: canvas.width,
          height: canvas.height,
          stampedAt: at.toISOString(),
        }),
      );
      await saveResult(body);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Hasil gagal disimpan ke Riwayat.",
      );
    } finally {
      setSaving(false);
    }
  };

  const coords = formatCoords(settings.latitude, settings.longitude);

  // Narrow screens stack in reading order: stage, then the numbered steps,
  // then the download bar. Wide screens place the columns side by side.
  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-8 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(370px,430px)] lg:items-start lg:gap-x-12 lg:gap-y-6 lg:px-10 lg:py-12">
      {/* Stage */}
      <div className="lg:col-start-1 lg:row-start-1 lg:max-w-[860px]">
        <h1 className="mb-2 font-display text-[clamp(1.7rem,3.6vw,2.6rem)] font-extrabold uppercase leading-[1.02]">
          Bubuhkan waktu
          <br />
          <span className="text-cerulean">dan tempat</span> pada foto
        </h1>
        <p className="mb-6 max-w-[48ch] text-[0.95rem] leading-relaxed text-ink-70">
          Unggah foto, isi lokasi, ambil koordinat. Legenda tergambar langsung di
          perangkat Anda dan siap diunduh.
        </p>

        <PreviewFrame image={image} settings={settings} at={at} />
      </div>

      {/* Output */}
      <div className="order-3 border border-rule-firm bg-card lg:order-none lg:col-start-1 lg:row-start-2 lg:max-w-[860px]">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="sm:w-32 sm:shrink-0">
            <SegmentedControl
              name="Format berkas"
              value={format}
              onChange={setFormat}
              options={[
                { value: "jpg", label: "JPG" },
                { value: "png", label: "PNG" },
              ]}
            />
          </div>
          <Button
            variant="primary"
            size="lg"
            onClick={download}
            disabled={!image || saving}
            className="w-full flex-1 sm:w-auto"
          >
            <Download size={18} strokeWidth={2.4} />
            {saving ? "Menyiapkan" : "Unduh gambar"}
          </Button>
        </div>
        <p
          role="status"
          className={cn(
            "border-t border-rule px-4 py-2.5 font-mono text-[0.66rem] leading-relaxed",
            saveError
              ? "bg-magenta-wash text-ink"
              : saved
                ? "bg-citrus-wash text-ink"
                : "text-ink-45",
          )}
        >
          {saveError
            ? "Gambar terunduh, tetapi belum masuk Riwayat: " + saveError
            : saved
              ? "Terunduh: " + saved + " — tersimpan di Riwayat Hasil."
              : image
                ? "Hasil unduhan otomatis tercatat di Riwayat Hasil."
                : "Unggah gambar untuk mengaktifkan unduhan."}
        </p>
      </div>

      {/* Controls */}
      <div className="order-2 space-y-9 lg:order-none lg:col-start-2 lg:row-start-1 lg:row-span-2">
        <section>
          <StepHeading step="01" title="Sumber gambar" />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => loadFile(e.target.files?.[0])}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => loadFile(e.target.files?.[0])}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => galleryRef.current?.click()}>
              <ImagePlus size={17} strokeWidth={2} />
              Dari galeri
            </Button>
            <Button onClick={() => cameraRef.current?.click()}>
              <Camera size={17} strokeWidth={2} />
              Ambil foto
            </Button>
          </div>
          {image ? (
            <div className="animate-rise mt-2 flex items-center gap-3 border border-rule-firm bg-card px-3 py-2.5">
              <span aria-hidden className="h-2 w-2 shrink-0 bg-citrus" />
              <span className="min-w-0 flex-1 truncate font-mono text-[0.68rem] text-ink-70">
                {fileName}
              </span>
              <button
                type="button"
                onClick={clearImage}
                className="flex items-center gap-1.5 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-ink-45 transition-colors hover:text-magenta"
              >
                <Trash2 size={13} /> Hapus
              </button>
            </div>
          ) : null}
        </section>

        <section>
          <StepHeading step="02" title="Lokasi & koordinat" />
          <div className="space-y-4">
            <Field label="Nama lokasi" htmlFor="lokasi" hint="baris pertama legenda">
              <TextInput
                id="lokasi"
                value={settings.locationName}
                onChange={(e) => patch({ locationName: e.target.value })}
                placeholder="Gudang B, Jl. Raya Bekasi KM 24"
                maxLength={90}
              />
            </Field>

            <div className="border border-rule-firm bg-card">
              <div className="flex items-center gap-2 border-b border-rule px-3 py-2.5">
                <span
                  aria-hidden
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    gps === "ready" && "animate-live bg-magenta",
                    gps === "loading" && "animate-live bg-cerulean",
                    gps === "error" && "bg-magenta-deep",
                    gps === "idle" && "bg-ink-45",
                  )}
                />
                <span className="label-eyebrow text-ink-70">
                  {gps === "ready"
                    ? "GPS terbaca"
                    : gps === "loading"
                      ? "Membaca GPS"
                      : "GPS perangkat"}
                </span>
                <span className="tnum ml-auto font-mono text-[0.64rem] text-ink-45">
                  {gps === "ready" ? gpsMessage : ""}
                </span>
              </div>

              <p className="tnum px-3 py-3 font-mono text-[0.76rem] text-ink">
                {coords || <span className="text-ink-45">Koordinat belum diisi</span>}
              </p>

              <div className="grid grid-cols-2 gap-2 px-3 pb-3">
                <TextInput
                  aria-label="Lintang"
                  inputMode="decimal"
                  placeholder="Lintang"
                  className="h-9 font-mono text-[0.72rem]"
                  value={settings.latitude ?? ""}
                  onChange={(e) =>
                    patch({
                      latitude: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
                <TextInput
                  aria-label="Bujur"
                  inputMode="decimal"
                  placeholder="Bujur"
                  className="h-9 font-mono text-[0.72rem]"
                  value={settings.longitude ?? ""}
                  onChange={(e) =>
                    patch({
                      longitude: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </div>

              {/* Both labels are nowrap; below ~380px they stack rather than
                  push the panel past the viewport. */}
              <div className="flex flex-col gap-2 border-t border-rule p-3 min-[380px]:flex-row">
                <Button
                  size="sm"
                  onClick={requestGps}
                  disabled={gps === "loading"}
                  className="flex-1"
                >
                  <Crosshair size={14} strokeWidth={2.2} />
                  {gps === "loading" ? "Membaca" : "Ambil koordinat"}
                </Button>
                <Button size="sm" variant="ghost" onClick={clearCoords}>
                  Kosongkan
                </Button>
              </div>
            </div>

            {gps === "error" && gpsMessage ? (
              <p
                role="alert"
                className="border-l-2 border-magenta bg-magenta-wash px-3 py-2 text-[0.82rem] leading-relaxed text-ink"
              >
                {gpsMessage}
              </p>
            ) : null}
          </div>
        </section>

        <section>
          <StepHeading step="03" title="Tampilan legenda" />
          <div className="space-y-4">
            <Field label="Format tanggal" htmlFor="format-tanggal">
              <SelectInput
                id="format-tanggal"
                value={settings.dateFormat}
                onChange={(e) => patch({ dateFormat: e.target.value })}
              >
                {DATE_FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <Field label="Posisi legenda">
              <SegmentedControl
                name="Posisi legenda"
                value={settings.legendPosition}
                onChange={(legendPosition) => patch({ legendPosition })}
                options={LEGEND_POSITIONS}
              />
            </Field>

            <Field label="Jenis huruf">
              <SegmentedControl
                name="Jenis huruf"
                value={settings.fontFamily}
                onChange={(fontFamily) => patch({ fontFamily })}
                options={FONT_FAMILIES}
              />
            </Field>

            <Field
              label="Ukuran huruf"
              htmlFor="ukuran"
              hint={settings.fontSize + " px pada lebar 1080"}
            >
              <input
                id="ukuran"
                type="range"
                min={18}
                max={72}
                step={2}
                value={settings.fontSize}
                onChange={(e) => patch({ fontSize: Number(e.target.value) })}
                className="h-11 w-full"
              />
            </Field>

            <Field label="Warna teks">
              <div className="flex gap-2">
                {FONT_COLORS.map((c) => {
                  const active = settings.fontColor === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      aria-label={c.label}
                      aria-pressed={active}
                      onClick={() => patch({ fontColor: c.value })}
                      style={{ backgroundColor: c.value }}
                      className={cn(
                        "h-9 flex-1 border transition-all",
                        active
                          ? "border-ink shadow-[inset_0_0_0_2px_var(--card)]"
                          : "border-rule-firm hover:border-ink-45",
                      )}
                    />
                  );
                })}
              </div>
            </Field>

            <label className="flex cursor-pointer items-center gap-3 border border-rule-firm bg-card px-3 py-3">
              <input
                type="checkbox"
                checked={settings.showPlate}
                onChange={(e) => patch({ showPlate: e.target.checked })}
                className="h-4 w-4 accent-[var(--cerulean)]"
              />
              <span className="text-sm text-ink">Beri alas gelap di belakang teks</span>
            </label>

            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setSettings((s) => ({
                  ...DEFAULT_SETTINGS,
                  locationName: s.locationName,
                  latitude: s.latitude,
                  longitude: s.longitude,
                }))
              }
            >
              <RotateCcw size={13} /> Kembalikan tampilan bawaan
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
