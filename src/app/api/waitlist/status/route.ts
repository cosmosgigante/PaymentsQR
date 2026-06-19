import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET — cliente consulta su estado (público, polling)
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Falta token" }, { status: 400 });

  const entry = await db.waitlistEntry.findUnique({ where: { clientToken: token } });
  if (!entry) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Auto-expirar si fue llamado y no llegó a tiempo
  let status = entry.status;
  if (status === "CALLED" && entry.expiresAt && entry.expiresAt < new Date()) {
    await db.waitlistEntry.update({ where: { id: entry.id }, data: { status: "EXPIRED" } });
    status = "EXPIRED";
  }

  // Recalcular posición actual en la cola
  const ahead = status === "WAITING"
    ? await db.waitlistEntry.count({ where: { restaurantId: entry.restaurantId, status: "WAITING", createdAt: { lt: entry.createdAt } } })
    : 0;

  return NextResponse.json({
    status,
    position: ahead + 1,
    name: entry.name,
    partySize: entry.partySize,
    estimatedWait: entry.estimatedWait,
    tableNumber: entry.tableNumber,
    calledAt: entry.calledAt,
    expiresAt: entry.expiresAt,
    seatedAt: entry.seatedAt,
  });
}
