"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Field, SelectInput } from "@/components/ui/field";
import { readJson } from "@/lib/api";
import { LEVELS, regionLabel, type Region } from "@/lib/wilayah";

/** Lists change only when Permendagri does, so fetch each one once per session. */
const cache = new Map<string, Region[]>();

async function fetchRegions(parent: string | null): Promise<Region[]> {
  const key = parent ?? "";
  const hit = cache.get(key);
  if (hit) return hit;
  const data = await readJson<{ regions: Region[] }>(
    await fetch("/api/wilayah" + (parent ? `?parent=${parent}` : "")),
  );
  cache.set(key, data.regions);
  return data.regions;
}

export type WilayahSelection = {
  code: string | null;
  label: string;
};

export function WilayahPicker({
  preset,
  onChange,
}: {
  /** Chain to display, e.g. the result of a coordinate lookup. */
  preset?: Region[] | null;
  onChange: (selection: WilayahSelection) => void;
}) {
  const [options, setOptions] = useState<Region[][]>([[], [], [], []]);
  const [chosen, setChosen] = useState<(Region | null)[]>([null, null, null, null]);
  const [loading, setLoading] = useState<number | null>(0);
  const [error, setError] = useState("");
  const applied = useRef<Region[] | null>(null);

  const loadInto = useCallback(async (index: number, parent: string | null) => {
    setLoading(index);
    setError("");
    try {
      const regions = await fetchRegions(parent);
      setOptions((prev) => {
        const next = [...prev];
        next[index] = regions;
        return next;
      });
    } catch {
      setError("Daftar wilayah gagal dimuat. Periksa koneksi, lalu pilih ulang.");
    } finally {
      setLoading(null);
    }
  }, []);

  // `loading` already starts at 0, so the first list needs no synchronous
  // state write here — only the async result is applied.
  useEffect(() => {
    let cancelled = false;
    fetchRegions(null)
      .then((regions) => {
        if (cancelled) return;
        setOptions((prev) => [regions, prev[1], prev[2], prev[3]]);
        setLoading(null);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Daftar provinsi gagal dimuat. Periksa koneksi, lalu muat ulang halaman.");
        setLoading(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // A lookup result fills the selects and pulls in the sibling lists, so the
  // user can still change any level afterwards.
  useEffect(() => {
    if (!preset || preset === applied.current) return;
    applied.current = preset;

    let cancelled = false;
    const next: (Region | null)[] = [null, null, null, null];
    for (const region of preset) next[region.level - 1] = region;

    Promise.all(
      [null, ...preset.slice(0, 3).map((r) => r.code)].map((parent) =>
        fetchRegions(parent).catch(() => [] as Region[]),
      ),
    ).then((lists) => {
      if (cancelled) return;
      setOptions([lists[0] ?? [], lists[1] ?? [], lists[2] ?? [], lists[3] ?? []]);
      setChosen(next);
      setLoading(null);
    });

    return () => {
      cancelled = true;
    };
  }, [preset]);

  const pick = (index: number, code: string) => {
    const region = options[index].find((r) => r.code === code) ?? null;

    // Choosing a level invalidates everything below it.
    const nextChosen = chosen.map((c, i) =>
      i < index ? c : i === index ? region : null,
    );
    setChosen(nextChosen);
    setOptions((prev) => prev.map((o, i) => (i > index ? [] : o)));
    applied.current = null;

    if (region && index < 3) void loadInto(index + 1, region.code);

    const chain = nextChosen.filter((r): r is Region => r !== null);
    const deepest = chain[chain.length - 1] ?? null;
    onChange({
      code: deepest?.code ?? null,
      label: chain.length ? regionLabel(chain) : "",
    });
  };

  return (
    <div className="space-y-4">
      {LEVELS.map((level, i) => {
        const parentChosen = i === 0 || chosen[i - 1] !== null;
        const list = options[i];
        const isLoading = loading === i;

        return (
          <Field
            key={level.level}
            label={level.label}
            htmlFor={"wilayah-" + level.level}
            hint={
              isLoading
                ? "memuat…"
                : parentChosen && list.length
                  ? list.length + " pilihan"
                  : undefined
            }
          >
            <SelectInput
              id={"wilayah-" + level.level}
              value={chosen[i]?.code ?? ""}
              disabled={!parentChosen || isLoading}
              onChange={(e) => pick(i, e.target.value)}
            >
              <option value="">
                {parentChosen ? level.placeholder : "Pilih " + LEVELS[i - 1].label + " dulu"}
              </option>
              {list.map((region) => (
                <option key={region.code} value={region.code}>
                  {region.name}
                </option>
              ))}
            </SelectInput>
          </Field>
        );
      })}

      {error ? (
        <p
          role="alert"
          className="border-l-2 border-magenta bg-magenta-wash px-3 py-2 text-[0.82rem] leading-relaxed text-ink"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
