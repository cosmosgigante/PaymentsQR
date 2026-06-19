import { redirect } from "next/navigation";
import { resolveServerAdmin } from "@/lib/account";
import { createClient } from "@/lib/supabase/server";
import PerfilClient from "./PerfilClient";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const admin = await resolveServerAdmin();
  // Superadmin va a su panel
  if (admin?.role === "SUPERADMIN") redirect("/setup");
  // No logueado
  if (!admin) redirect("/?error=unauthorized");

  // Foto de perfil de Google (si existe en la sesión de Supabase)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const avatarUrl = (user?.user_metadata?.avatar_url as string | undefined) ?? null;
  const displayName = (user?.user_metadata?.full_name as string | undefined) ?? admin.email;

  return (
    <PerfilClient
      email={admin.email}
      avatarUrl={avatarUrl}
      displayName={displayName}
    />
  );
}
