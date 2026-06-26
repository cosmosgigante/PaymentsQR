import { getSession } from "@/lib/auth";

// Banner global de impersonación. Si un superadmin está navegando como soporte
// (admin_token con impersonating=true), muestra una barra fija arriba para volver
// a /setup. Server component: se incluye al tope de cada página del operador.
export default async function ImpersonationBanner() {
  const session = await getSession();
  if (!session?.impersonating) return null;

  return (
    <a
      href="/api/setup/exit-impersonate"
      className="sticky top-0 z-[60] flex items-center justify-center gap-2 bg-amber-500 text-white text-sm font-semibold py-2 px-4 hover:bg-amber-600 transition-colors"
      style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
    >
      ← Volver a mi panel de superadmin
      <span className="text-amber-100 font-normal hidden sm:inline">· estás viendo como soporte</span>
    </a>
  );
}
