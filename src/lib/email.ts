import { formatArs, formatDate, paymentSourceLabel, type PaymentSource } from "@/lib/plans";

type InvitationParams = {
  to: string;
  restaurantName: string;
  loginUrl: string;
  planLabel: string;
  priceArs: number;
  startedAt: Date;
  endsAt: Date;
  extraBranches: number;
  paymentSource: PaymentSource;
};

/**
 * Envía el mail de bienvenida al dueño de un restaurante recién creado, vía Brevo.
 *
 * Incluye los datos de la suscripción (plan, precio, fechas, forma de pago) y el
 * link para entrar con Google usando el email registrado. No hace falta token ni
 * contraseña: el login es con Google.
 *
 * No-op silencioso si BREVO_API_KEY / BREVO_SENDER_EMAIL no están configurados,
 * y nunca lanza: así la creación del restaurante jamás se rompe por el mail.
 * Devuelve true si Brevo aceptó el envío, false en cualquier otro caso.
 */
export async function sendInvitationEmail(p: InvitationParams): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  if (!apiKey || !senderEmail) return false;

  const senderName = process.env.BREVO_SENDER_NAME || "PaymentsQR";
  const safeName = p.restaurantName.replace(/[<>]/g, "");

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:8px 0;color:#6b7280;font-size:13px">${label}</td>
      <td style="padding:8px 0;color:#111827;font-size:13px;font-weight:600;text-align:right">${value}</td>
    </tr>`;

  const extrasRow = p.extraBranches > 0
    ? row("Sucursales extra", `${p.extraBranches}`)
    : "";

  const htmlContent = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1f2937">
    <div style="font-size:40px;margin-bottom:8px">🍽️</div>
    <h1 style="font-size:22px;font-weight:700;margin:0 0 12px">¡Bienvenido a PaymentsQR!</h1>
    <p style="font-size:15px;line-height:1.6;color:#4b5563;margin:0 0 20px">
      Tu restaurante <strong>${safeName}</strong> ya está activo. Acá están los datos de tu cuenta y tu suscripción:
    </p>

    <table style="width:100%;border-collapse:collapse;background:#f9fafb;border:1px solid #f0f0f0;border-radius:12px;padding:8px 16px;margin-bottom:24px">
      <tbody style="display:block;padding:4px 16px">
        ${row("Usuario", p.to)}
        ${row("Plan", p.planLabel)}
        ${extrasRow}
        ${row("Precio", `${formatArs(p.priceArs)} ARS`)}
        ${row("Inicio", formatDate(p.startedAt))}
        ${row("Vence", formatDate(p.endsAt))}
        ${row("Forma de pago", paymentSourceLabel(p.paymentSource))}
      </tbody>
    </table>

    <p style="font-size:15px;line-height:1.6;color:#4b5563;margin:0 0 20px">
      Entrá a tu panel con tu cuenta de <strong>Google</strong> usando este mismo email para cargar el menú,
      generar los QR de las mesas y ver los pedidos en tiempo real.
    </p>
    <a href="${p.loginUrl}" style="display:inline-block;background:#1e3a8a;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 28px;border-radius:12px">
      Entrar a mi panel
    </a>
    <p style="font-size:12px;color:#9ca3af;margin:28px 0 0">
      Si no esperabas este mail, podés ignorarlo.
    </p>
  </div>`;

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        to: [{ email: p.to }],
        subject: `¡Bienvenido a PaymentsQR! Tu restaurante "${safeName}" ya está activo`,
        htmlContent,
      }),
    });
    if (!res.ok) {
      console.error("[email] Brevo respondió", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email] Falló el envío vía Brevo:", e);
    return false;
  }
}
