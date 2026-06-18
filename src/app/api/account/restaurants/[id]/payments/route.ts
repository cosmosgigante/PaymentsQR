import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAccountAdmin, accountAccess } from "@/lib/account";
import { encryptSecret, secretHint } from "@/lib/secrets";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

// Verifica que el que pide es admin de la cuenta y tiene acceso a ESE restorán.
async function requireRestaurantAccess(req: NextRequest, restaurantId: string) {
  const ctx = await getAccountAdmin(req);
  if (!ctx) return null;
  const restaurant = await db.restaurant.findFirst({
    where: { id: restaurantId, accountId: ctx.account.id }, select: { id: true },
  });
  if (!restaurant) return null;
  const access = accountAccess(ctx.admin, ctx.account);
  if (!access.isFull && !(access.allowedRestaurantIds ?? []).includes(restaurantId)) return null;
  return ctx;
}

// Devuelve la config de cobro ENMASCARADA. El token nunca sale del backend.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireRestaurantAccess(req, id);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const pm = await db.paymentMethod.findUnique({
    where: { restaurantId_provider: { restaurantId: id, provider: "MERCADOPAGO" } },
  });

  return NextResponse.json({
    mercadopago: {
      enabled: pm?.enabled ?? false,
      hasToken: !!pm?.encryptedToken,
      tokenHint: pm?.tokenHint ?? null,
      publicKey: pm?.publicKey ?? null,
      accountName: pm?.accountName ?? null,
    },
  });
}

// Guarda la config. El Access Token es write-only: si viene, se valida contra
// MercadoPago, se cifra y se guarda; si no viene, se conserva el anterior.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireRestaurantAccess(req, id);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json().catch(() => ({})) as { enabled?: boolean; accessToken?: string; publicKey?: string };

  const existing = await db.paymentMethod.findUnique({
    where: { restaurantId_provider: { restaurantId: id, provider: "MERCADOPAGO" } },
    select: { encryptedToken: true },
  });

  const fields: {
    enabled: boolean; publicKey?: string | null;
    encryptedToken?: string; tokenHint?: string; accountName?: string;
  } = { enabled: !!body.enabled };

  if (typeof body.publicKey === "string") fields.publicKey = body.publicKey.trim() || null;

  const newToken = typeof body.accessToken === "string" ? body.accessToken.trim() : "";
  if (newToken) {
    // Validar contra MercadoPago: confirma que el token sirve y a qué cuenta va la plata.
    let mpUser: { id?: number; email?: string; nickname?: string } | null = null;
    try {
      const mpRes = await fetch("https://api.mercadopago.com/users/me", {
        headers: { Authorization: `Bearer ${newToken}` },
      });
      if (!mpRes.ok) return NextResponse.json({ error: "El Access Token de MercadoPago no es válido" }, { status: 400 });
      mpUser = await mpRes.json();
    } catch {
      return NextResponse.json({ error: "No se pudo validar el token con MercadoPago, probá de nuevo" }, { status: 502 });
    }
    fields.encryptedToken = encryptSecret(newToken);
    fields.tokenHint = secretHint(newToken);
    fields.accountName = mpUser?.email || mpUser?.nickname || (mpUser?.id ? String(mpUser.id) : "MercadoPago");
  }

  // No se puede activar el cobro sin un token cargado
  if (fields.enabled && !fields.encryptedToken && !existing?.encryptedToken) {
    return NextResponse.json({ error: "Cargá el Access Token de MercadoPago para activar el cobro" }, { status: 400 });
  }

  await db.paymentMethod.upsert({
    where: { restaurantId_provider: { restaurantId: id, provider: "MERCADOPAGO" } },
    create: { restaurantId: id, provider: "MERCADOPAGO", ...fields },
    update: fields,
  });

  await logActivity({
    accountId: ctx.account.id, restaurantId: id, actorType: "OWNER", actorName: ctx.admin.email,
    category: "CUENTA", action: "PAYMENT_CONFIG",
    detail: `MercadoPago ${fields.enabled ? "activado" : "desactivado"}${newToken ? " (token actualizado)" : ""}`,
  });

  return NextResponse.json({ ok: true });
}
