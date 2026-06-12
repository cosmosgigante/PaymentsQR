import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { db } from "@/lib/db";
import { getAccountAdmin } from "@/lib/account";
import { sanitizePermissions, parsePermissions, parseRestaurantIds } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

// Genera una contraseña segura (sin caracteres confusos como O/0, I/l/1). Máx 18.
function generatePassword(len = 14): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const n = Math.min(18, Math.max(8, len));
  let out = "";
  for (let i = 0; i < n; i++) out += alphabet[randomInt(alphabet.length)];
  return out;
}

// Lista los tokens de acceso de la cuenta (con dispositivos activos)
export async function GET(req: NextRequest) {
  const ctx = await getAccountAdmin(req);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const tokens = await db.accessToken.findMany({
    where: { accountId: ctx.account.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { sessions: true } } },
  });

  const data = tokens.map((t) => ({
    id: t.id,
    name: t.name,
    authType: t.authType,
    username: t.username,
    email: t.email,
    permissions: parsePermissions(t.permissions),
    restaurantIds: parseRestaurantIds(t.restaurantIds),
    maxDevices: t.maxDevices,
    expiresAt: t.expiresAt,
    isActive: t.isActive,
    activeDevices: t._count.sessions,
    createdAt: t.createdAt,
  }));

  return NextResponse.json({ tokens: data });
}

// Crea un token de acceso para el personal
export async function POST(req: NextRequest) {
  const ctx = await getAccountAdmin(req);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  let body: {
    name?: string; authType?: string; username?: string; password?: string; email?: string;
    permissions?: unknown; restaurantIds?: unknown;
    maxDevices?: number; durationDays?: number;
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Request inválido" }, { status: 400 }); }

  const name = String(body.name ?? "").trim().slice(0, 60);
  if (!name) return NextResponse.json({ error: "Poné un nombre" }, { status: 400 });

  const authType = body.authType === "GOOGLE" ? "GOOGLE" : "PASSWORD";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Datos según el tipo de acceso
  let username: string | null = null;
  let passwordHash: string | null = null;
  let email: string | null = null;
  let generatedPassword: string | null = null; // se devuelve UNA vez para mostrarla

  if (authType === "GOOGLE") {
    email = String(body.email ?? "").trim().toLowerCase();
    if (!emailRegex.test(email)) return NextResponse.json({ error: "Email de Google inválido" }, { status: 400 });
    // Único POR CUENTA: el mismo email puede tener acceso en otra cuenta, no en ésta
    const used = await db.accessToken.findFirst({ where: { accountId: ctx.account.id, email } });
    if (used) return NextResponse.json({ error: "Ese email ya tiene un acceso en esta cuenta" }, { status: 409 });
  } else {
    username = String(body.username ?? "").trim().toLowerCase().replace(/\s+/g, "").slice(0, 40);
    if (username.length < 3) return NextResponse.json({ error: "El usuario debe tener al menos 3 caracteres" }, { status: 400 });
    // El usuario es único en todo el sistema (así se detectan colisiones al loguear)
    const exists = await db.accessToken.findUnique({ where: { username } });
    if (exists) return NextResponse.json({ error: "Ese nombre de usuario ya está en uso" }, { status: 409 });
    // La contraseña la genera el sistema (no la elige el admin)
    generatedPassword = generatePassword(14);
    passwordHash = await bcrypt.hash(generatedPassword, 12);
  }

  // Permisos: al menos un módulo con acceso
  const permissions = sanitizePermissions(body.permissions);
  if (Object.keys(permissions).length === 0) {
    return NextResponse.json({ error: "Tildá al menos un permiso" }, { status: 400 });
  }

  // Restoranes: deben pertenecer a la cuenta, al menos 1
  const requestedIds = Array.isArray(body.restaurantIds) ? body.restaurantIds.filter((x): x is string => typeof x === "string") : [];
  const owned = await db.restaurant.findMany({
    where: { accountId: ctx.account.id, id: { in: requestedIds } },
    select: { id: true },
  });
  const restaurantIds = owned.map((r) => r.id);
  if (restaurantIds.length === 0) {
    return NextResponse.json({ error: "Asigná al menos un restorán" }, { status: 400 });
  }

  const maxDevices = Math.max(1, Math.min(10, Math.floor(Number(body.maxDevices) || 1)));
  const days = Math.max(0, Math.floor(Number(body.durationDays) || 0));
  const expiresAt = days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;

  const token = await db.accessToken.create({
    data: {
      accountId: ctx.account.id,
      name,
      authType,
      username,
      passwordHash,
      email,
      permissions: JSON.stringify(permissions),
      restaurantIds: JSON.stringify(restaurantIds),
      maxDevices,
      expiresAt,
    },
    select: { id: true, name: true },
  });

  await logActivity({
    accountId: ctx.account.id, actorType: "OWNER", actorName: ctx.account.ownerEmail,
    category: "CUENTA", action: "ACCESS_CREATE",
    detail: `Acceso "${name}" (${authType === "GOOGLE" ? "Google" : "usuario"})`,
  });

  return NextResponse.json({ ok: true, token, username, generatedPassword }, { status: 201 });
}
