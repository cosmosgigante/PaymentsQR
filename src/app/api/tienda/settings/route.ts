import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST — ajustes rápidos del kiosco: abierto/cerrado + tiempo estimado de prep.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.restaurantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.role === "STAFF") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const body = await req.json().catch(() => ({})) as { storeOpen?: boolean; prepEstimateMin?: number };
  const data: { storeOpen?: boolean; prepEstimateMin?: number } = {};
  if (typeof body.storeOpen === "boolean") data.storeOpen = body.storeOpen;
  if (typeof body.prepEstimateMin === "number") data.prepEstimateMin = Math.min(180, Math.max(1, Math.round(body.prepEstimateMin)));
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nada para guardar" }, { status: 400 });

  await db.restaurant.update({ where: { id: session.restaurantId }, data });
  return NextResponse.json({ ok: true, ...data });
}
