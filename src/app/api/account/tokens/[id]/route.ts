import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAccountAdmin } from "@/lib/account";
import { logActivity } from "@/lib/activity";

// Elimina (revoca) un token de acceso. Borra también sus sesiones (cascade).
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAccountAdmin(req);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;

  // Verificar que el token pertenezca a la cuenta antes de borrar
  const token = await db.accessToken.findFirst({
    where: { id, accountId: ctx.account.id },
    select: { id: true, name: true },
  });
  if (!token) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await db.accessToken.delete({ where: { id } });

  await logActivity({
    accountId: ctx.account.id, actorType: "OWNER", actorName: ctx.account.ownerEmail,
    category: "CUENTA", action: "ACCESS_DELETE", detail: `Acceso "${token.name}"`,
  });

  return NextResponse.json({ ok: true });
}
