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

// Vista CENTRADA EN EL CLIENTE: cada cuenta = un Cliente A (responsable de pago) con
// sus socios (A2), sus restoranes y su membresía. Clase calculada, no guardada.
export async function GET(req: NextRequest) {
  const admin = await requireSuperAdmin(req);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const accounts = await db.account.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      admins: { select: { email: true, role: true, accessScope: true, passwordHash: true } },
      restaurants: {
        select: { id: true, name: true, slug: true, isActive: true, status: true, _count: { select: { tables: true, orders: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const clients = accounts.map((a) => {
    const now = Date.now();
    const subActive = a.subscriptionEndsAt ? new Date(a.subscriptionEndsAt).getTime() > now : false;
    return {
      id: a.id,
      ownerEmail: a.ownerEmail,
      name: a.name,
      planType: a.planType,
      priceArs: a.priceArs,
      subscriptionEndsAt: a.subscriptionEndsAt,
      isActive: a.isActive,
      canceledAt: a.canceledAt,
      membershipActive: a.isActive && subActive,
      members: a.admins.map((m) => ({
        email: m.email,
        role: m.role,
        accessScope: m.accessScope,
        hasPassword: !!m.passwordHash,
        // El dueño/responsable de pago es "A"; los socios que no pagan son "A2".
        clientClass: m.email === a.ownerEmail ? "A" : "A2",
      })),
      restaurants: a.restaurants,
    };
  });

  // Restoranes legacy sin cuenta (modelo viejo) — para no perderlos de vista.
  const legacy = await db.restaurant.findMany({
    where: { accountId: null },
    select: { id: true, name: true, slug: true, isActive: true, status: true, _count: { select: { tables: true, orders: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ clients, legacyRestaurants: legacy });
}
