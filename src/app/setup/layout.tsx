import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

// Layout del panel superadmin — solo SUPERADMIN puede entrar
export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Sin sesión → login
  if (!user?.email) redirect("/");

  // Verificar que el email tenga rol SUPERADMIN en la DB
  const admin = await db.admin.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { role: true },
  });

  if (!admin || admin.role !== "SUPERADMIN") {
    redirect("/?error=unauthorized");
  }

  return <>{children}</>;
}
