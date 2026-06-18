import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isRestaurantOperative } from "@/lib/restaurant";
import { joinOrCreateSession, readDeviceId, setDeviceCookie } from "@/lib/tableSession";

// Resuelve (o crea) la sesión de mesa para el dispositivo que escanea el QR.
// Aplica el límite de dispositivos y devuelve el historial de pedidos de la sesión.
export async function POST(req: NextRequest) {
  let body: { tableToken?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Request inválido" }, { status: 400 }); }

  const tableToken = body.tableToken;
  if (!tableToken || typeof tableToken !== "string" || tableToken.length > 200) {
    return NextResponse.json({ error: "Mesa no válida" }, { status: 400 });
  }

  const table = await db.table.findUnique({
    where: { qrToken: tableToken },
    include: { restaurant: { include: { account: true } } },
  });
  if (!table || !table.isActive) {
    return NextResponse.json({ error: "Mesa no válida" }, { status: 404 });
  }
  if (!isRestaurantOperative(table.restaurant, table.restaurant.account)) {
    return NextResponse.json({ error: "Este restaurante no está disponible en este momento" }, { status: 403 });
  }

  const { deviceId } = readDeviceId(req);
  const maxDevices = table.restaurant.maxTableDevices ?? 2;

  const { session, full } = await joinOrCreateSession({
    tableId: table.id,
    restaurantId: table.restaurantId,
    maxDevices,
    deviceId,
    startStatus: table.restaurant.confirmTableEnabled ? "PENDING_CONFIRM" : "OPEN",
  });

  if (full) {
    const res = NextResponse.json({ ok: false, full: true, maxDevices: session.maxDevices });
    setDeviceCookie(res, deviceId);
    return res;
  }

  // Historial real de la sesión (lo que se viene pidiendo en esta mesa).
  const orders = await db.order.findMany({
    where: { tableSessionId: session.id },
    orderBy: { createdAt: "asc" },
    include: { items: { include: { menuItem: true } }, table: true },
  });

  // ¿El local tiene cobro online configurado? (para mostrar el botón "Pagar")
  const pm = await db.paymentMethod.findUnique({
    where: { restaurantId_provider: { restaurantId: table.restaurantId, provider: "MERCADOPAGO" } },
    select: { enabled: true, encryptedToken: true },
  });
  const payEnabled = !!(pm?.enabled && pm.encryptedToken);

  const res = NextResponse.json({
    ok: true,
    session: { id: session.id, status: session.status, paymentStatus: session.paymentStatus },
    payEnabled,
    orders,
  });
  setDeviceCookie(res, deviceId);
  return res;
}
