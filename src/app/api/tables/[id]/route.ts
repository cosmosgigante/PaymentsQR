import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  let body: { isActive?: unknown; label?: unknown };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Request inválido" }, { status: 400 }); }

  const table = await db.table.findFirst({
    where: { id, restaurantId: session.restaurantId },
  });
  if (!table) return NextResponse.json({ error: "Mesa no encontrada" }, { status: 404 });

  const updated = await db.table.update({
    where: { id },
    data: {
      ...(body.isActive === true || body.isActive === false ? { isActive: body.isActive } : {}),
      ...(body.label !== undefined ? { label: body.label ? String(body.label).slice(0, 100) : null } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const table = await db.table.findFirst({
    where: { id, restaurantId: session.restaurantId },
  });
  if (!table) return NextResponse.json({ error: "Mesa no encontrada" }, { status: 404 });

  await db.table.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
