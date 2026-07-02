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
  });
}
