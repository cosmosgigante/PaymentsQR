import { redirect } from "next/navigation";
import { resolveServerAdmin } from "@/lib/account";
import { getSession } from "@/lib/auth";

export default async function CuentaLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const admin = await resolveServerAdmin();

  // Superadmin en impersonación → puede entrar, resolveServerAdmin ya devuelve el admin impersonado
  if (admin?.role === "SUPERADMIN" && !session?.impersonating) redirect("/setup");
  if (!admin?.accountId) redirect("/?error=unauthorized");

  return <>{children}</>;
}
