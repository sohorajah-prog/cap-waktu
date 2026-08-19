import { NextResponse } from "next/server";
import { deleteResult, findResult, toDTO } from "@/lib/results-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const notFound = NextResponse.json(
  { error: "Hasil tidak ditemukan." },
  { status: 404 },
);

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** GET /api/results/:id — detail satu hasil. */
export async function GET(_request: Request, ctx: RouteContext<"/api/results/[id]">) {
  const id = parseId((await ctx.params).id);
  if (id === null) return notFound;

  const row = findResult(id);
  if (!row) return notFound;
  return NextResponse.json({ result: toDTO(row) });
}

/** DELETE /api/results/:id — menghapus hasil beserta berkasnya. */
export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/results/[id]">,
) {
  const id = parseId((await ctx.params).id);
  if (id === null) return notFound;

  try {
    const removed = await deleteResult(id);
    if (!removed) return notFound;
    return NextResponse.json({ id });
  } catch (error) {
    console.error("DELETE /api/results/[id]", error);
    return NextResponse.json({ error: "Hasil gagal dihapus." }, { status: 500 });
  }
}
