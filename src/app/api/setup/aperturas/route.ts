import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { verticalLabel } from "@/lib/verticals";

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
  return admin?.role === "SUPERADMIN" ? user.email.toLowerCase() : null;
}

// GET — negocios esperando aprobación (status PENDING) + historial de aperturas aprobadas.
export async function GET(req: NextRequest) {
  const sa = await requireSuperAdmin(req);
  if (!sa) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const [pending, history] = await Promise.all([
    db.restaurant.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true, name: true, slug: true, vertical: true, createdAt: true,
        account: { select: { id: true, name: true, ownerEmail: true } },
      },
    }),
    db.activityLog.findMany({
      where: { action: "RESTAURANT_APPROVE" },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: { id: true, detail: true, actorName: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({ pending, history });
}

// PATCH — aprobar una apertura (restaurantId → status ACTIVE). Queda en el historial.
export async function PATCH(req: NextRequest) {
  const saEmail = await requireSuperAdmin(req);
  if (!saEmail) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json().catch(() => ({})) as { restaurantId?: string };
  if (!body.restaurantId) return NextResponse.json({ error: "Falta restaurantId" }, { status: 400 });

  const restaurant = await db.restaurant.findUnique({
    where: { id: body.restaurantId },
    select: { id: true, name: true, status: true, accountId: true, vertical: true },
  });
  if (!restaurant) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  if (restaurant.status === "ACTIVE") return NextResponse.json({ ok: true, alreadyActive: true });

  await db.restaurant.update({ where: { id: restaurant.id }, data: { status: "ACTIVE" } });

  await logActivity({
    accountId: restaurant.accountId, restaurantId: restaurant.id,
    actorType: "SUPERADMIN", actorName: saEmail,
    category: "CUENTA", action: "RESTAURANT_APPROVE",
    detail: `${saEmail} aprobó la apertura de ${verticalLabel(restaurant.vertical)} "${restaurant.name}"`,
  });

  return NextResponse.json({ ok: true });
}
