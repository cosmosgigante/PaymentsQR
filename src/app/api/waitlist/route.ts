import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";

// POST — cliente se anota en la lista de espera (público, desde el QR de puerta)
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!await rateLimit(`waitlist:${ip}`, 5, 60 * 1000)) {
    return NextResponse.json({ error: "Demasiados intentos" }, { status: 429 });
  }

  let body: { slug?: string; name?: string; partySize?: number };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Request inválido" }, { status: 400 }); }

  const { slug, name, partySize } = body;
  if (!slug || !name?.trim() || !partySize || partySize < 1 || partySize > 20) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const restaurant = await db.restaurant.findUnique({
    where: { slug }, select: { id: true, name: true, waitlistEnabled: true, waitlistEstimatedWait: true },
  });
  if (!restaurant) return NextResponse.json({ error: "Restaurante no encontrado" }, { status: 404 });
  if (!restaurant.waitlistEnabled) return NextResponse.json({ error: "La lista de espera no está activa en este momento" }, { status: 403 });

  // Expirar entradas vencidas antes de calcular posición
  const now = new Date();
  await db.waitlistEntry.updateMany({
    where: { restaurantId: restaurant.id, status: "CALLED", expiresAt: { lt: now } },
    data: { status: "EXPIRED" },
  });

  const waiting = await db.waitlistEntry.count({ where: { restaurantId: restaurant.id, status: "WAITING" } });
  const position = waiting + 1;

  const entry = await db.waitlistEntry.create({
    data: {
      restaurantId: restaurant.id,
      name: name.trim().slice(0, 60),
      partySize,
      position,
      estimatedWait: restaurant.waitlistEstimatedWait * position,
      status: "WAITING",
    },
  });

  return NextResponse.json({
    ok: true,
    clientToken: entry.clientToken,
    position,
    estimatedWait: entry.estimatedWait,
    restaurantName: restaurant.name,
  }, { status: 201 });
}
