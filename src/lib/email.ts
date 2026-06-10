type InvitationParams = {
  to: string;
  restaurantName: string;
  loginUrl: string;
};

/**
 * Envía el mail de invitación al dueño de un restaurante recién creado, vía Brevo.
 *
 * Como el login es con Google, no hace falta token ni contraseña: el mail solo
 * le avisa que su restaurante está listo y le da el link para entrar con la
 * cuenta de Google del email que el superadmin registró.
 *
 * No-op silencioso si BREVO_API_KEY / BREVO_SENDER_EMAIL no están configurados,
 * y nunca lanza: así la creación del restaurante jamás se rompe por el mail.
 * Devuelve true si Brevo aceptó el envío, false en cualquier otro caso.
 */
export async function sendInvitationEmail({ to, restaurantName, loginUrl }: InvitationParams): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  if (!apiKey || !senderEmail) return false;

  const senderName = process.env.BREVO_SENDER_NAME || "PaymentsQR";
  const safeName = restaurantName.replace(/[<>]/g, "");

  const htmlContent = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1f2937">
    <div style="font-size:40px;margin-bottom:8px">🍽️</div>
    <h1 style="font-size:22px;font-weight:700;margin:0 0 12px">Tu restaurante ya está listo</h1>
    <p style="font-size:15px;line-height:1.6;color:#4b5563;margin:0 0 8px">
      Diste de alta <strong>${safeName}</strong> en PaymentsQR. Ya podés ingresar a tu panel para
      cargar el menú, generar los QR de las mesas y ver los pedidos en tiempo real.
    </p>
    <p style="font-size:15px;line-height:1.6;color:#4b5563;margin:0 0 24px">
      Entrá con tu cuenta de <strong>Google</strong> usando este mismo email (<strong>${to}</strong>).
    </p>
    <a href="${loginUrl}" style="display:inline-block;background:#1e3a8a;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 28px;border-radius:12px">
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
        to: [{ email: to }],
        subject: `Tu restaurante "${safeName}" ya está listo en PaymentsQR`,
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
