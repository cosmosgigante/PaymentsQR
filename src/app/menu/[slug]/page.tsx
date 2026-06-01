import { db } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function PublicMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const restaurant = await db.restaurant.findUnique({
    where: { slug },
    include: {
      menuCategories: {
        orderBy: { sortOrder: "asc" },
        include: {
          items: {
            where: { available: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  if (!restaurant) notFound();

  const hasItems = restaurant.menuCategories.some((c) => c.items.length > 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-5 text-center">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl"
          style={{ backgroundColor: restaurant.primaryColor + "22", border: `1px solid ${restaurant.primaryColor}44` }}>
          🍽️
        </div>
        <h1 className="text-xl font-bold">{restaurant.name}</h1>
        <p className="text-zinc-500 text-xs mt-1">Menú digital</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {!hasItems ? (
          <div className="text-center py-16">
            <p className="text-zinc-500 text-sm">El menú está siendo preparado.</p>
            <p className="text-zinc-600 text-xs mt-1">Volvé pronto.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {restaurant.menuCategories.filter((c) => c.items.length > 0).map((category) => (
              <div key={category.id}>
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-3">
                  {category.name}
                </h2>
                <div className="space-y-2">
                  {category.items.map((item) => (
                    <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">{item.name}</p>
                        {item.description && (
                          <p className="text-zinc-500 text-xs mt-0.5 leading-relaxed">{item.description}</p>
                        )}
                      </div>
                      <span className="shrink-0 font-bold text-sm" style={{ color: restaurant.primaryColor }}>
                        ${item.price.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-zinc-700 text-[10px] mt-10">
          Powered by <span className="text-zinc-500">PaymentsQR</span>
        </p>
      </div>
    </div>
  );
}
