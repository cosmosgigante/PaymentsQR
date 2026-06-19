import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import WaitlistClient from "./WaitlistClient";

export const dynamic = "force-dynamic";

export default async function EsperarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const restaurant = await db.restaurant.findUnique({
    where: { slug },
    select: { id: true, name: true, primaryColor: true, waitlistEnabled: true, waitlistEstimatedWait: true },
  });
  if (!restaurant) notFound();

  return (
    <WaitlistClient
      slug={slug}
      restaurantName={restaurant.name}
      primaryColor={restaurant.primaryColor}
      waitlistEnabled={restaurant.waitlistEnabled}
      estimatedWait={restaurant.waitlistEstimatedWait}
    />
  );
}
