import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

// Panel general — solo el admin general (dueño de una Cuenta) puede entrar.
export default async function CuentaLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) redirect("/");

  const admin = await db.admin.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { accountId: true, role: true },
  });

  // Superadmin va a su propio panel; quien no tiene cuenta, fuera.
  if (admin?.role === "SUPERADMIN") redirect("/setup");
  if (!admin?.accountId) redirect("/?error=unauthorized");

  return <>{children}</>;
}
