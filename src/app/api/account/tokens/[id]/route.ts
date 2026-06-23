import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAccountAdmin } from "@/lib/account";
import { logActivity } from "@/lib/activity";

// PATCH — pausar/reanudar o editar un acceso (excepto nombre y usuario, que son inmutables).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAccountAdmin(req);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const token = await db.accessToken.findFirst({
    where: { id, accountId: ctx.account.id },
    select: { id: true, name: true, isActive: true },
  });
  if (!token) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await req.json().catch(() => ({})) as {
    isActive?: boolean;
    permissions?: Record<string, string>;
    restaurantIds?: string[];
    maxDevices?: number;
    expiresAt?: string | null;
  };

  const data: Record<string, unknown> = {};
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (body.permissions) data.permissions = JSON.stringify(body.permissions);
  if (Array.isArray(body.restaurantIds)) data.restaurantIds = JSON.stringify(body.restaurantIds);
  if (typeof body.maxDevices === "number") data.maxDevices = Math.min(10, Math.max(1, Math.round(body.maxDevices)));
  if ("expiresAt" in body) data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nada para guardar" }, { status: 400 });

  const updated = await db.accessToken.update({ where: { id }, data });

  const action = typeof body.isActive === "boolean"
    ? (body.isActive ? "ACCESS_RESUME" : "ACCESS_PAUSE")
    : "ACCESS_EDIT";
  await logActivity({
    accountId: ctx.account.id, actorType: "OWNER", actorName: ctx.account.ownerEmail,
    category: "CUENTA", action,
    detail: `Acceso "${token.name}" — ${action === "ACCESS_PAUSE" ? "pausado" : action === "ACCESS_RESUME" ? "reactivado" : "editado"}`,
  });

  return NextResponse.json({ ok: true, token: updated });
}

// DELETE — elimina un acceso. Requiere estar pausado (isActive = false) para evitar borrar uno activo por error.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAccountAdmin(req);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const token = await db.accessToken.findFirst({
    where: { id, accountId: ctx.account.id },
    select: { id: true, name: true, isActive: true },
  });
  if (!token) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (token.isActive) return NextResponse.json({ error: "Pausá el acceso antes de eliminarlo" }, { status: 409 });

  await db.accessToken.delete({ where: { id } });

  await logActivity({
    accountId: ctx.account.id, actorType: "OWNER", actorName: ctx.account.ownerEmail,
    category: "CUENTA", action: "ACCESS_DELETE", detail: `Acceso "${token.name}"`,
  });

  return NextResponse.json({ ok: true });
}
