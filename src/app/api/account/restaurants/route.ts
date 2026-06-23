import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAccountAdmin, accountAccess } from "@/lib/account";
import { rateLimit } from "@/lib/rateLimit";
import { logActivity } from "@/lib/activity";
import { isValidVertical, resolveSubtype, verticalLabel } from "@/lib/verticals";

// El admin general crea un restorán adicional. Queda PENDIENTE hasta que el
// superadmin lo habilite (manual o, a futuro, automático tras el pago).
export async function POST(req: NextRequest) {
  const ctx = await getAccountAdmin(req);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  if (!accountAccess(ctx.admin, ctx.account).isFull) {
    return NextResponse.json({ error: "Sin permiso para crear restoranes" }, { status: 403 });
  }

  if (!await rateLimit(`account-create-rest:${ctx.account.id}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Demasiados intentos" }, { status: 429 });
  }

  let body: { name?: string; slug?: string; vertical?: string; subtype?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Request inválido" }, { status: 400 }); }

  if (!body.name || !body.slug) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  // Categoría del negocio (default gastronómico para no romper el alta vieja)
  const vertical = isValidVertical(body.vertical) ? body.vertical : "GASTRONOMICO";
  const businessSubtype = resolveSubtype(vertical, body.subtype);

  const cleanSlug = String(body.slug).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 60);
  if (cleanSlug.length < 2) {
    return NextResponse.json({ error: "Slug demasiado corto" }, { status: 400 });
  }

  const existing = await db.restaurant.findUnique({ where: { slug: cleanSlug } });
  if (existing) return NextResponse.json({ error: "Esa URL ya está en uso, probá otra" }, { status: 409 });

  const restaurant = await db.restaurant.create({
    data: {
      name: String(body.name).slice(0, 100),
      slug: cleanSlug,
      accountId: ctx.account.id,
      status: "PENDING",
      vertical,
      businessSubtype,
    },
    select: { id: true, name: true, slug: true, status: true, vertical: true, businessSubtype: true },
  });

  await logActivity({
    accountId: ctx.account.id, restaurantId: restaurant.id, actorType: "OWNER",
    actorName: ctx.account.ownerEmail, category: "CUENTA", action: "RESTAURANT_CREATE",
    detail: `${verticalLabel(vertical)} "${restaurant.name}" (pendiente)`,
  });

  return NextResponse.json({ ok: true, restaurant }, { status: 201 });
}
