import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAccountAdmin, accountAccess } from "@/lib/account";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

// El que pide debe ser admin de la cuenta y tener acceso a ESE restorán.
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

// Ajustes del flujo operativo del restorán.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireRestaurantAccess(req, id);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json().catch(() => ({})) as {
    confirmTableEnabled?: boolean;
    maxTableDevices?: number;
    flowConfirmEnabled?: boolean;
    flowDeliveredEnabled?: boolean;
    waitlistEnabled?: boolean;
    waitlistEstimatedWait?: number;
    waitlistExpiryMinutes?: number;
  };

  const data: {
    confirmTableEnabled?: boolean; maxTableDevices?: number;
    flowConfirmEnabled?: boolean; flowDeliveredEnabled?: boolean;
    waitlistEnabled?: boolean; waitlistEstimatedWait?: number; waitlistExpiryMinutes?: number;
  } = {};
  if (typeof body.confirmTableEnabled === "boolean") data.confirmTableEnabled = body.confirmTableEnabled;
  if (typeof body.maxTableDevices === "number") data.maxTableDevices = Math.min(10, Math.max(1, Math.round(body.maxTableDevices)));
  if (typeof body.flowConfirmEnabled === "boolean") data.flowConfirmEnabled = body.flowConfirmEnabled;
  if (typeof body.flowDeliveredEnabled === "boolean") data.flowDeliveredEnabled = body.flowDeliveredEnabled;
  if (typeof body.waitlistEnabled === "boolean") data.waitlistEnabled = body.waitlistEnabled;
  if (typeof body.waitlistEstimatedWait === "number") data.waitlistEstimatedWait = Math.min(120, Math.max(1, Math.round(body.waitlistEstimatedWait)));
  if (typeof body.waitlistExpiryMinutes === "number") data.waitlistExpiryMinutes = Math.min(30, Math.max(1, Math.round(body.waitlistExpiryMinutes)));
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nada para guardar" }, { status: 400 });

  await db.restaurant.update({ where: { id }, data });

  await logActivity({
    accountId: ctx.account.id, restaurantId: id, actorType: "OWNER", actorName: ctx.admin.email,
    category: "CUENTA", action: "OPERATIONS_CONFIG",
    detail: [
      data.confirmTableEnabled !== undefined && `confirmar mesa ${data.confirmTableEnabled ? "ON" : "OFF"}`,
      data.maxTableDevices !== undefined && `máx ${data.maxTableDevices} disp.`,
      data.flowConfirmEnabled !== undefined && `paso confirmación ${data.flowConfirmEnabled ? "ON" : "OFF"}`,
      data.flowDeliveredEnabled !== undefined && `paso entrega ${data.flowDeliveredEnabled ? "ON" : "OFF"}`,
      data.waitlistEnabled !== undefined && `lista de espera ${data.waitlistEnabled ? "ON" : "OFF"}`,
      data.waitlistEstimatedWait !== undefined && `espera ${data.waitlistEstimatedWait} min/pers.`,
      data.waitlistExpiryMinutes !== undefined && `expira en ${data.waitlistExpiryMinutes} min`,
    ].filter(Boolean).join(" · ") || "sin cambios",
  });

  return NextResponse.json({ ok: true });
}
