import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageAny } from "@/lib/staff";
import { logActivity } from "@/lib/activity";
import { emitEvent } from "@/lib/events";

// POST — caja activa/desactiva la lista de espera del restorán en tiempo real
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  // Requiere permiso de gestión en Mozos o Cocina
  if (!canManageAny(session, ["MOZOS", "COCINA"])) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { enabled } = await req.json().catch(() => ({})) as { enabled?: boolean };
  if (typeof enabled !== "boolean") return NextResponse.json({ error: "Falta enabled" }, { status: 400 });

  await db.restaurant.update({ where: { id: session.restaurantId }, data: { waitlistEnabled: enabled } });

  // Sincroniza el flag en los otros dispositivos del personal (Mozos/Cocina)
  emitEvent(session.restaurantId, { type: "WAITLIST_TOGGLE", enabled });

  await logActivity({
    accountId: session.accountId, restaurantId: session.restaurantId,
    actorType: session.role, actorName: session.actorName,
    category: "PEDIDOS", action: "WAITLIST_TOGGLE",
    detail: `Lista de espera ${enabled ? "activada" : "desactivada"}`,
  });

  return NextResponse.json({ ok: true, enabled });
}
