import { type Instrumentation } from "next";

// Captura de errores del servidor (rutas API, Server Components, etc.).
// Quedan en los logs de Vercel Y en la tabla ErrorLog (panel "Salud del sistema").
// Todo defensivo: si el guardado falla, nunca rompe la request.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const e = err as Error & { digest?: string };
  const payload = {
    message: (e?.message ?? String(err)).slice(0, 1000),
    digest: e?.digest,
    path: request?.path,
    method: request?.method,
    routeType: context?.routeType,
  };

  console.error("[request-error]", JSON.stringify(payload));

  try {
    const { db } = await import("@/lib/db");
    await db.errorLog.create({
      data: { ...payload, source: "SERVER" },
    });
  } catch {
    // Nunca dejar que el logueo rompa nada (ej.: si la base no responde).
  }
};
