import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { isRestaurantOperative } from "@/lib/restaurant";
import TiendaClient from "./TiendaClient";

export const dynamic = "force-dynamic";

export default async function TiendaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const restaurant = await db.restaurant.findUnique({
    where: { slug },
    select: {
      id: true, name: true, primaryColor: true, vertical: true,
      storeOpen: true, prepEstimateMin: true,
      isActive: true, status: true, subscriptionEndsAt: true,
      account: { select: { isActive: true, subscriptionEndsAt: true } },
      menuCategories: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true, name: true, sortOrder: true,
          items: {
            where: { available: true },
            orderBy: { sortOrder: "asc" },
            select: { id: true, name: true, description: true, price: true, image: true, available: true, sortOrder: true },
          },
        },
      },
    },
  });

  if (!restaurant || restaurant.vertical !== "KIOSCO_DESPENSA") notFound();

  if (!isRestaurantOperative(restaurant, restaurant.account)) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6 text-center bg-[#fafafa]">
        <div>
          <p className="text-4xl mb-3">🏪</p>
          <h1 className="text-xl font-bold text-zinc-900">{restaurant.name}</h1>
          <p className="text-zinc-400 text-sm mt-1">La tienda no está disponible en este momento.</p>
        </div>
      </div>
    );
  }

  return (
    <TiendaClient
      slug={slug}
      restaurantName={restaurant.name}
      primaryColor={restaurant.primaryColor}
      storeOpen={restaurant.storeOpen}
      prepEstimateMin={restaurant.prepEstimateMin}
      categories={JSON.parse(JSON.stringify(restaurant.menuCategories))}
    />
  );
}
