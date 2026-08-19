"use client";

import { readJson, type ResultDTO } from "./api";

export type { ResultDTO };

export type HistoryState = {
  status: "idle" | "loading" | "ready" | "error";
  results: ResultDTO[];
  error: string | null;
};

const EMPTY: HistoryState = { status: "idle", results: [], error: null };

let state: HistoryState = EMPTY;
const listeners = new Set<() => void>();

function set(next: Partial<HistoryState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

const OFFLINE = "Tidak dapat menghubungi server. Periksa koneksi Anda.";

/**
 * fetch rejects with an untranslated "Failed to fetch" when the network is
 * down; everything past this point carries a message meant for the reader.
 */
async function request(input: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    throw new Error(OFFLINE);
  }
}

function message(error: unknown) {
  return error instanceof Error ? error.message : OFFLINE;
}

/** Reads the history once per page visit; call again to force a refresh. */
export async function loadHistory(force = false): Promise<void> {
  if (!force && (state.status === "loading" || state.status === "ready")) return;
  set({ status: "loading", error: null });
  try {
    const data = await readJson<{ results: ResultDTO[] }>(
      await request("/api/results", { cache: "no-store" }),
    );
    set({ status: "ready", results: data.results, error: null });
  } catch (error) {
    set({ status: "error", error: message(error) });
  }
}

/** Saves one result. Returns the stored entry so callers can confirm it. */
export async function saveResult(body: FormData): Promise<ResultDTO> {
  const data = await readJson<{ result: ResultDTO }>(
    await request("/api/results", { method: "POST", body }),
  );
  if (state.status === "ready") {
    set({ results: [data.result, ...state.results] });
  }
  return data.result;
}

export function dismissError() {
  if (state.error) set({ error: null });
}

/**
 * Optimistic delete: the row leaves the view at once and comes back with an
 * explanation if the server refuses.
 */
export async function removeResult(id: number): Promise<void> {
  const previous = state.results;
  set({ results: previous.filter((r) => r.id !== id), error: null });
  try {
    await readJson(await request(`/api/results/${id}`, { method: "DELETE" }));
  } catch (error) {
    set({ results: previous, error: "Hasil gagal dihapus. " + message(error) });
  }
}

export async function clearHistory(): Promise<void> {
  const previous = state.results;
  set({ results: [], error: null });
  try {
    await readJson(await request("/api/results", { method: "DELETE" }));
  } catch (error) {
    set({ results: previous, error: "Riwayat gagal dikosongkan. " + message(error) });
  }
}

export const historyStore = {
  subscribe(onChange: () => void) {
    listeners.add(onChange);
    return () => listeners.delete(onChange);
  },
  getSnapshot: () => state,
  getServerSnapshot: () => EMPTY,
};
