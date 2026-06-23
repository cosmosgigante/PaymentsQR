import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import KioskoQR from "@/components/admin/KioskoQR";

export const dynamic = "force-dynamic";

export default async function AdminQRPage() {
  const session = await getSession();
  if (!session) redirect("/");
  if (session.role === "STAFF") redirect("/trabajo");

  const restaurant = await db.restaurant.findUnique({
    where: { id: session.restaurantId },
    select: { slug: true },
  });
  if (!restaurant) redirect("/admin");

  return <KioskoQR slug={restaurant.slug} />;
}
