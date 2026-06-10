import { redirect } from "next/navigation";
import { resolveServerAdmin } from "@/lib/account";

// Panel general — solo el admin general (dueño de una Cuenta) puede entrar.
export default async function CuentaLayout({ children }: { children: React.ReactNode }) {
  const admin = await resolveServerAdmin();

  if (admin?.role === "SUPERADMIN") redirect("/setup");
  if (!admin?.accountId) redirect("/?error=unauthorized");

  return <>{children}</>;
}
