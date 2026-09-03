import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canAccess } from "@/lib/staff";
import { liveTableStates } from "@/lib/tableSession";

export const dynamic = "force-dynamic";

// Estado en vivo de las mesas del restorán (para el poll de la vista de Mesas).
// Visible para quien puede ver Mesas, Mozos o Cocina.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canAccess(session, "MESAS") && !canAccess(session, "MOZOS") && !canAccess(session, "COCINA")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const live = await liveTableStates(session.restaurantId);
  return NextResponse.json(live);
}
