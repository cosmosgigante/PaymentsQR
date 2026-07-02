import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

async function requireSuperAdmin(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return req.cookies.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const admin = await db.admin.findUnique({ where: { email: user.email.toLowerCase() } });
  return admin?.role === "SUPERADMIN" ? admin : null;
}

// Métricas globales de la plataforma para los dueños (superadmins). Solo lectura:
// no modifica nada de suscripciones ni cuentas, solo agrega números.
export async function GET(req: NextRequest) {
  const sa = await requireSuperAdmin(req);
  if (!sa) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const since30 = new Date();
  since30.setDate(since30.getDate() - 30);

  const [
    totalAccounts, activeAccounts, newAccounts30,
    totalRestaurants, activeRestaurants, pendingRestaurants,
    gastronomicos, kioscos,
    mrr,
  ] = await Promise.all([
    db.account.count(),
    db.account.count({ where: { isActive: true } }),
    db.account.count({ where: { createdAt: { gte: since30 } } }),
    db.restaurant.count(),
    db.restaurant.count({ where: { status: "ACTIVE" } }),
    db.restaurant.count({ where: { status: "PENDING" } }),
    db.restaurant.count({ where: { vertical: "GASTRONOMICO" } }),
    db.restaurant.count({ where: { vertical: "KIOSCO_DESPENSA" } }),
    db.account.aggregate({ _sum: { priceArs: true }, where: { isActive: true } }),
  ]);

  // Desglose: qué empresa paga y cuánto (solo clientes activos con precio cargado).
  const cuentas = await db.account.findMany({
    where: { isActive: true },
    select: { id: true, name: true, ownerEmail: true, planType: true, priceArs: true, subscriptionEndsAt: true },
    orderBy: { priceArs: "desc" },
  });

  // Crecimiento: clientes acumulados al cierre de cada uno de los últimos 6 meses.
  const todas = await db.account.findMany({ select: { createdAt: true } });
  const MES_CORTO = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const ahora = new Date();
  const crecimiento = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    const finMes = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    crecimiento.push({
      mes: MES_CORTO[d.getMonth()],
      clientes: todas.filter((a) => a.createdAt <= finMes).length,
    });
  }
  const pagos = cuentas.map((c) => ({
    id: c.id,
    nombre: c.name ?? c.ownerEmail,
    plan: c.planType ?? "—",
    montoMensual: c.priceArs ?? 0,
    venceEl: c.subscriptionEndsAt,
  }));

  return NextResponse.json({
    clientes: {
      total: totalAccounts,
      activos: activeAccounts,
      inactivos: totalAccounts - activeAccounts,
      nuevos30: newAccounts30,
    },
    negocios: {
      total: totalRestaurants,
      activos: activeRestaurants,
      pendientes: pendingRestaurants,
      gastronomicos,
      kioscos,
    },
    ingresoSuscripciones: {
      mensualAprox: mrr._sum.priceArs ?? 0,
    },
    pagos,
    crecimiento,
  });
}
