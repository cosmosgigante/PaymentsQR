import { NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// HOOK ABIERTO — Pago online del kiosco con MercadoPago. PENDIENTE de instalar.
//
// Acá va el "pagar ahora" (online) que habilita el pedido ANÓNIMO:
//   - tomar el pedido + total,
//   - leer el token MP del restorán (lib/secrets.decryptSecret sobre PaymentMethod),
//   - crear preferencia con lib/mercadopago.createCheckoutPreference,
//   - snapshot de cobro por ORDEN (no por sesión de mesa): requiere
//     Payment.sessionId nullable + Payment.orderId, y una rama en
//     /api/webhooks/mercadopago que marque PAID por orderId.
//
// Mientras tanto devuelve "no disponible" para que el front muestre "Próximamente".
// ─────────────────────────────────────────────────────────────────────────────
export async function POST() {
  return NextResponse.json(
    { error: "El pago online todavía no está disponible en esta tienda.", pending: true },
    { status: 501 },
  );
}
