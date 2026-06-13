import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAccountAdmin, accountAccess } from "@/lib/account";
import { parseRestaurantIds } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

// Lista los socios (admins) de la cuenta.
export async function GET(req: NextRequest) {
  const ctx = await getAccountAdmin(req);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  if (!accountAccess(ctx.admin, ctx.account).isFull) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const admins = await db.admin.findMany({
    where: { accountId: ctx.account.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, accessScope: true, scopeRestaurantIds: true, passwordHash: true, createdAt: true },
  });

  const partners = admins.map((a) => ({
    id: a.id,
    email: a.email,
    isOwner: a.email === ctx.account.ownerEmail,
    accessScope: a.accessScope,
    restaurantIds: parseRestaurantIds(a.scopeRestaurantIds),
    hasPassword: !!a.passwordHash,
    createdAt: a.createdAt,
  }));

  return NextResponse.json({ partners });
}

// Agrega un socio a la cuenta. Solo un admin FULL puede hacerlo.
export async function POST(req: NextRequest) {
  const ctx = await getAccountAdmin(req);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  if (!accountAccess(ctx.admin, ctx.account).isFull) {
    return NextResponse.json({ error: "Sin permiso para agregar socios" }, { status: 403 });
  }

  let body: { email?: string; accessScope?: string; restaurantIds?: unknown };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Request inválido" }, { status: 400 }); }

  const email = String(body.email ?? "").trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return NextResponse.json({ error: "Email inválido" }, { status: 400 });

  const accessScope = body.accessScope === "RESTRICTED" ? "RESTRICTED" : "FULL";

  let scopeRestaurantIds: string[] = [];
  if (accessScope === "RESTRICTED") {
    const requested = Array.isArray(body.restaurantIds) ? body.restaurantIds.filter((x): x is string => typeof x === "string") : [];
    const owned = await db.restaurant.findMany({ where: { accountId: ctx.account.id, id: { in: requested } }, select: { id: true } });
    scopeRestaurantIds = owned.map((r) => r.id);
    if (scopeRestaurantIds.length === 0) {
      return NextResponse.json({ error: "Asigná al menos un restorán" }, { status: 400 });
    }
  }

  const exists = await db.admin.findUnique({ where: { email } });
  if (exists) return NextResponse.json({ error: "Ese email ya tiene un acceso de administrador" }, { status: 409 });

  await db.admin.create({
    data: {
      accountId: ctx.account.id,
      email,
      role: "OWNER",
      accessScope,
      scopeRestaurantIds: JSON.stringify(scopeRestaurantIds),
    },
  });

  await logActivity({
    accountId: ctx.account.id, actorType: "OWNER", actorName: ctx.account.ownerEmail,
    category: "CUENTA", action: "PARTNER_ADD",
    detail: `Socio ${email} (${accessScope === "FULL" ? "acceso completo" : "restringido"})`,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
