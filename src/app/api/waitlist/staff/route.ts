import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccess } from "@/lib/staff";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!canAccess(session, "MOZOS") && !canAccess(session, "COCINA")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const now = new Date();

  // Expirar automáticamente los que se pasaron del tiempo
  await db.waitlistEntry.updateMany({
    where: { restaurantId: session.restaurantId, status: "CALLED", expiresAt: { lt: now } },
    data: { status: "EXPIRED" },
  });

  const entries = await db.waitlistEntry.findMany({
    where: { restaurantId: session.restaurantId, status: { in: ["WAITING", "CALLED"] } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ entries });
}
