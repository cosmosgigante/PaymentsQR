import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET — lista los QR/points del negocio de la sesión, divididos por tipo.
export async function GET() {
  const session = await getSession();
  if (!session?.restaurantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const qrs = await db.accessQR.findMany({
    where: { restaurantId: session.restaurantId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ qrs });
}

// POST — crea un QR (kind CLIENT | STAFF) con su etiqueta.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.restaurantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { kind?: string; label?: string };
  const kind = body.kind === "STAFF" ? "STAFF" : "CLIENT";
  const label = String(body.label ?? "").trim().slice(0, 60);
  if (!label) return NextResponse.json({ error: "Poné una etiqueta" }, { status: 400 });

  const count = await db.accessQR.count({ where: { restaurantId: session.restaurantId } });
  if (count >= 50) return NextResponse.json({ error: "Demasiados QR" }, { status: 400 });

  const qr = await db.accessQR.create({
    data: { restaurantId: session.restaurantId, kind, label },
  });
  return NextResponse.json({ ok: true, qr }, { status: 201 });
}

// DELETE — elimina un QR del negocio (IDOR: solo del propio restorán).
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session?.restaurantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const qr = await db.accessQR.findFirst({ where: { id, restaurantId: session.restaurantId } });
  if (!qr) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await db.accessQR.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
