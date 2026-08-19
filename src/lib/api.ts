import type { FontFamilyKey, LegendPosition } from "./stamp";

/** One history entry as the API returns it. Dates travel as ISO strings. */
export type ResultDTO = {
  id: number;
  uploadId: number;
  fileName: string;
  format: "jpg" | "png";
  width: number;
  height: number;
  /** Moment printed on the legend. */
  stampedAt: string;
  /** Moment the result was saved. */
  createdAt: string;
  imageUrl: string;
  originalUrl: string;
  settings: {
    locationName: string;
    latitude: number | null;
    longitude: number | null;
    dateFormat: string;
    legendPosition: LegendPosition;
    fontSize: number;
    fontColor: string;
    fontFamily: FontFamilyKey;
    showPlate: boolean;
  };
};

export type ApiError = { error: string };

export function isApiError(value: unknown): value is ApiError {
  return typeof value === "object" && value !== null && "error" in value;
}

/** Throws with the server's Indonesian message so callers can show it as-is. */
export async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      isApiError(body) ? body.error : "Permintaan gagal. Coba lagi.",
    );
  }
  return body as T;
}
