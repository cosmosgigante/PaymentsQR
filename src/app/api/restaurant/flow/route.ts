import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Devuelve la config de flujo del restorán de la sesión actual.
// La usa la cocina y los mozos para saber qué pasos están activos.
export async function GET() {
  const session = await getSession();
  if (!session?.restaurantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const r = await db.restaurant.findUnique({
    where: { id: session.restaurantId },
    select: { flowConfirmEnabled: true, flowDeliveredEnabled: true, waitlistEnabled: true },
  });

  return NextResponse.json({
    flowConfirmEnabled: r?.flowConfirmEnabled ?? true,
    flowDeliveredEnabled: r?.flowDeliveredEnabled ?? true,
    waitlistEnabled: r?.waitlistEnabled ?? false,
  });
}
