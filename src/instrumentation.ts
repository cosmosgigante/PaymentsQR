import { type Instrumentation } from "next";

// Captura de errores del servidor (rutas API, Server Components, etc.).
// Quedan registrados en los logs de Vercel — sin necesidad de cuentas externas.
// Este es el punto donde en el futuro se puede reenviar a Sentry u otro servicio.
export const onRequestError: Instrumentation.onRequestError = (err, request, context) => {
  const e = err as Error & { digest?: string };
  console.error("[request-error]", JSON.stringify({
    message: e?.message ?? String(err),
    digest: e?.digest,
    path: request?.path,
    method: request?.method,
    routeType: context?.routeType,
    routePath: context?.routePath,
  }));
};
