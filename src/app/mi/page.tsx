import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { SESSION_TTL_MS } from "@/lib/tableSession";
import MiClient from "./MiClient";

export const dynamic = "force-dynamic";

// Apartado Clientes (portal consumidor, Slice 1): el consumidor entra con Google y
// recupera sus "Sesiones activas" de mesa (retomar si cerró el navegador / perdió
// la cookie del dispositivo). Es público: sin login muestra la puerta de entrada.
export default async function MiPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email?.toLowerCase() ?? null;

  if (!email) {
    return <MiClient user={null} sessions={[]} />;
  }

  const name =
    (typeof data.user?.user_metadata?.full_name === "string" ? data.user.user_metadata.full_name : "") || email;

  // Sesiones activas donde este consumidor tiene al menos un pedido.
  const cutoff = new Date(Date.now() - SESSION_TTL_MS);
  const rows = await db.tableSession.findMany({
    where: {
      status: { not: "CLOSED" },
      lastActivityAt: { gte: cutoff },
      orders: { some: { customerEmail: email } },
    },
    orderBy: { lastActivityAt: "desc" },
    select: {
      id: true,
      lastActivityAt: true,
      status: true,
      table: { select: { qrToken: true, number: true, label: true } },
      restaurant: { select: { name: true } },
      orders: {
        where: { status: { not: "CANCELLED" } },
        select: { total: true, status: true, customerEmail: true },
      },
    },
  });

  const sessions = rows.map((s) => {
    const mine = s.orders.filter((o) => o.customerEmail === email);
    return {
      id: s.id,
      qrToken: s.table.qrToken,
      tableLabel: s.table.label ?? `Mesa ${s.table.number}`,
      restaurant: s.restaurant.name,
      lastActivityAt: s.lastActivityAt.toISOString(),
      pendingConfirm: s.status === "PENDING_CONFIRM",
      myOrders: mine.length,
      myTotal: mine.reduce((sum, o) => sum + o.total, 0),
      myUnpaid: mine.filter((o) => o.status !== "PAID").reduce((sum, o) => sum + o.total, 0),
      tableTotal: s.orders.reduce((sum, o) => sum + o.total, 0),
    };
  });

  return <MiClient user={{ name, email }} sessions={sessions} />;
}
