import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/staff";
import KitchenBoard from "@/components/kitchen/KitchenBoard";
import ImpersonationBanner from "@/components/ImpersonationBanner";

export default async function CocinaPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (!canAccess(session, "COCINA")) redirect("/trabajo");

  return <><ImpersonationBanner /><KitchenBoard /></>;
}
