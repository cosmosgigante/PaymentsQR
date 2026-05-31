import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import KitchenBoard from "@/components/kitchen/KitchenBoard";

export default async function CocinaPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  return <KitchenBoard />;
}
