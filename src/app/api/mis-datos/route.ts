import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

async function getEmail() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.email?.toLowerCase() ?? null;
}

// GET — Ver qué datos tiene el sistema sobre este email
export async function GET() {
  const email = await getEmail();
  if (!email) return NextResponse.json({ error: "Iniciá sesión con Google primero" }, { status: 401 });

  const orders = await db.order.findMany({
    where: { customerEmail: email },
    select: {
      id: true,
      status: true,
      total: true,
      customerName: true,
      customerEmail: true,
      notes: true,
      paymentMode: true,
      createdAt: true,
      table: { select: { number: true } },
      restaurant: { select: { name: true } },
      items: { select: { quantity: true, menuItem: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    email,
    totalOrders: orders.length,
    orders: orders.map((o) => ({
      id: o.id,
      restaurant: o.restaurant.name,
      table: o.table.number,
      status: o.status,
      total: o.total,
      paymentMode: o.paymentMode,
      items: o.items.map((i) => `${i.quantity}× ${i.menuItem.name}`),
      notes: o.notes,
      date: o.createdAt,
    })),
  });
}

// DELETE — Anonimizar todos los datos personales de este email
export async function DELETE() {
  const email = await getEmail();
  if (!email) return NextResponse.json({ error: "Iniciá sesión con Google primero" }, { status: 401 });

  const result = await db.order.updateMany({
    where: { customerEmail: email },
    data: { customerName: null, customerEmail: null, notes: null },
  });

  return NextResponse.json({
    ok: true,
    message: `Se anonimizaron ${result.count} pedido(s). Tu nombre y email fueron eliminados del sistema.`,
    count: result.count,
  });
}
