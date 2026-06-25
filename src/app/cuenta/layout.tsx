import { redirect } from "next/navigation";
import { resolveServerAdmin } from "@/lib/account";
import { getSession } from "@/lib/auth";

export default async function CuentaLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const admin = await resolveServerAdmin();

  // Superadmin en impersonación → puede entrar, resolveServerAdmin ya devuelve el admin impersonado
  if (admin?.role === "SUPERADMIN" && !session?.impersonating) redirect("/setup");
  if (!admin?.accountId) redirect("/?error=unauthorized");

  return (
    <>
      {session?.impersonating && (
        <a href="/api/setup/exit-impersonate"
          className="sticky top-0 z-[60] flex items-center justify-center gap-2 bg-amber-500 text-white text-sm font-semibold py-2 px-4 hover:bg-amber-600 transition-colors"
          style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}>
          <span>← Volver a mi panel de superadmin</span>
          <span className="text-amber-100 font-normal hidden sm:inline">· estás viendo como soporte la cuenta de {admin.account?.name ?? admin.account?.ownerEmail}</span>
        </a>
      )}
      {children}
    </>
  );
}
