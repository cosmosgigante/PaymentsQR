import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageAny } from "@/lib/staff";
import { logActivity } from "@/lib/activity";
import { emitEvent } from "@/lib/events";

// PATCH — personal llama, sienta, cancela o marca expirado
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canManageAny(session, ["MOZOS", "COCINA"])) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { action?: string; tableNumber?: number };
  if (!["call", "seat", "cancel"].includes(body.action ?? "")) {
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  }

  const entry = await db.waitlistEntry.findFirst({
    where: { id, restaurantId: session.restaurantId },
  });
  if (!entry) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const restaurant = await db.restaurant.findUnique({
    where: { id: session.restaurantId }, select: { waitlistExpiryMinutes: true },
  });

  const now = new Date();
  let data: Record<string, unknown> = {};
  let detail = "";

  if (body.action === "call") {
    const expiresAt = new Date(now.getTime() + (restaurant?.waitlistExpiryMinutes ?? 5) * 60000);
    data = { status: "CALLED", calledAt: now, expiresAt, tableNumber: body.tableNumber ?? null };
    detail = `${entry.name} llamado${body.tableNumber ? ` → Mesa ${body.tableNumber}` : ""}`;
  } else if (body.action === "seat") {
    data = { status: "SEATED", seatedAt: now, tableNumber: body.tableNumber ?? entry.tableNumber };
    detail = `${entry.name} sentado (${entry.partySize} personas)`;
  } else {
    data = { status: "CANCELLED" };
    detail = `${entry.name} cancelado de la lista`;
  }

  const updated = await db.waitlistEntry.update({ where: { id }, data });

  emitEvent(session.restaurantId, { type: "WAITLIST_UPDATED", entry: updated });

  await logActivity({
    accountId: session.accountId, restaurantId: session.restaurantId,
    actorType: session.role, actorName: session.actorName,
    category: "PEDIDOS", action: `WAITLIST_${body.action!.toUpperCase()}`,
    detail,
  });

  return NextResponse.json({ ok: true });
}
