// Integración con MercadoPago (Checkout Pro). El Access Token es el del restorán
// (cada local cobra a su propia cuenta). NUNCA se loguea ni se expone al cliente.

const MP_API = "https://api.mercadopago.com";

/** Crea una preferencia de Checkout Pro y devuelve el link de pago (init_point). */
export async function createCheckoutPreference(opts: {
  token: string;
  title: string;
  total: number;
  externalReference: string;   // id de la sesión de mesa
  notificationUrl: string;     // webhook
  backUrl: string;             // a dónde vuelve el comensal
}): Promise<{ id: string; initPoint: string } | { error: string }> {
  try {
    const res = await fetch(`${MP_API}/checkout/preferences`, {
      method: "POST",
      headers: { Authorization: `Bearer ${opts.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{
          title: opts.title,
          quantity: 1,
          currency_id: "ARS",
          unit_price: Math.round(opts.total * 100) / 100,
        }],
        external_reference: opts.externalReference,
        notification_url: opts.notificationUrl,
        back_urls: { success: opts.backUrl, pending: opts.backUrl, failure: opts.backUrl },
        auto_return: "approved",
      }),
    });
    if (!res.ok) return { error: "No se pudo crear el pago en MercadoPago" };
    const data = await res.json();
    if (!data.init_point) return { error: "MercadoPago no devolvió el link de pago" };
    return { id: data.id, initPoint: data.init_point as string };
  } catch {
    return { error: "Error de conexión con MercadoPago" };
  }
}

/** Consulta un pago por id. Fuente de verdad para confirmar el cobro (anti-fraude). */
export async function getPayment(token: string, paymentId: string): Promise<{
  status: string; externalReference: string | null; amount: number;
} | null> {
  try {
    const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const p = await res.json();
    return {
      status: p.status,
      externalReference: p.external_reference ?? null,
      amount: p.transaction_amount ?? 0,
    };
  } catch {
    return null;
  }
}
