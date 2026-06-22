import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isRestaurantOperative } from "@/lib/restaurant";
import { joinOrCreateSession, readDeviceId, setDeviceCookie } from "@/lib/tableSession";
import { decryptSecret } from "@/lib/secrets";
import { createCheckoutPreference } from "@/lib/mercadopago";
import { UNPAID } from "@/lib/orderFlow";

// Inicia el cobro de TODA la cuenta de la mesa con Checkout Pro de MercadoPago.
// El estado del pago vive en la sesión → es compartido entre los dispositivos.
export async function POST(req: NextRequest) {
  let body: { tableToken?: string; scope?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Request inválido" }, { status: 400 }); }

  const tableToken = body.tableToken;
  const scope = body.scope === "MINE" ? "MINE" : "ALL"; // dividir (lo mío) o pagar todo
  if (!tableToken || typeof tableToken !== "string" || tableToken.length > 200) {
    return NextResponse.json({ error: "Mesa no válida" }, { status: 400 });
  }

  const table = await db.table.findUnique({
    where: { qrToken: tableToken },
    include: { restaurant: { include: { account: true } } },
  });
  if (!table || !table.isActive) return NextResponse.json({ error: "Mesa no válida" }, { status: 404 });
  if (!isRestaurantOperative(table.restaurant, table.restaurant.account)) {
    return NextResponse.json({ error: "Restaurante no disponible" }, { status: 403 });
  }

  // El cobro online debe estar configurado por el restorán.
  const pm = await db.paymentMethod.findUnique({
    where: { restaurantId_provider: { restaurantId: table.restaurantId, provider: "MERCADOPAGO" } },
  });
  if (!pm?.enabled || !pm.encryptedToken) {
    return NextResponse.json({ error: "Este local no tiene el pago online habilitado" }, { status: 400 });
  }

  const { deviceId } = readDeviceId(req);
  const { session, full } = await joinOrCreateSession({
    tableId: table.id,
    restaurantId: table.restaurantId,
    maxDevices: table.restaurant.maxTableDevices ?? 2,
    deviceId,
    startStatus: table.restaurant.confirmTableEnabled ? "PENDING_CONFIRM" : "OPEN",
  });
  if (full) return NextResponse.json({ error: "Esta mesa alcanzó el máximo de dispositivos" }, { status: 409 });

  // Pedidos a cobrar: "MINE" = lo de este dispositivo (dividir), "ALL" = toda la mesa.
  const orders = await db.order.findMany({
    where: scope === "MINE"
      ? { tableSessionId: session.id, status: { in: UNPAID }, deviceId }
      : { tableSessionId: session.id, status: { in: UNPAID } },
    select: { id: true, total: true },
  });
  const total = orders.reduce((s, o) => s + o.total, 0);
  if (total <= 0) return NextResponse.json({ error: "No hay nada para pagar" }, { status: 400 });

  let token: string;
  try { token = decryptSecret(pm.encryptedToken); }
  catch { return NextResponse.json({ error: "Configuración de cobro inválida" }, { status: 500 }); }

  // Snapshot fijo de los pedidos cubiertos → cobro correcto al dividir la cuenta.
  const payment = await db.payment.create({
    data: {
      sessionId: session.id, restaurantId: table.restaurantId, deviceId,
      scope, amount: total, orderIds: JSON.stringify(orders.map((o) => o.id)),
    },
  });

  const origin = req.nextUrl.origin;
  const pref = await createCheckoutPreference({
    token,
    title: `${table.restaurant.name} — Mesa ${table.number}`,
    total,
    externalReference: payment.id,
    notificationUrl: `${origin}/api/webhooks/mercadopago?payment=${payment.id}`,
    backUrl: `${origin}/mesa/${tableToken}?paid=1`,
  });
  if ("error" in pref) {
    await db.payment.delete({ where: { id: payment.id } }).catch(() => {});
    return NextResponse.json({ error: pref.error }, { status: 502 });
  }
  await db.payment.update({ where: { id: payment.id }, data: { preferenceId: pref.id } });

  const res = NextResponse.json({ ok: true, initPoint: pref.initPoint });
  setDeviceCookie(res, deviceId);
  return res;
}
