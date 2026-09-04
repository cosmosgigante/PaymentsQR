import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isRestaurantOperative } from "@/lib/restaurant";

export const dynamic = "force-dynamic";

const MAX_KM = 25;

// Distancia en km entre dos coordenadas (fórmula de haversine).
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Descubrimiento público: dado lat/lng, devuelve los locales OPT-IN y operativos
// ordenados por cercanía. Sin login. (A escala conviene PostGIS; para el MVP se
// calcula en la app sobre los pocos locales opt-in.)
export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") ?? "");
  const lng = parseFloat(req.nextUrl.searchParams.get("lng") ?? "");
  if (!isFinite(lat) || !isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "Ubicación inválida" }, { status: 400 });
  }

  const restos = await db.restaurant.findMany({
    where: { discoverable: true, latitude: { not: null }, longitude: { not: null } },
    select: {
      name: true, slug: true, primaryColor: true, logo: true,
      vertical: true, address: true, latitude: true, longitude: true,
      isActive: true, status: true,
      account: { select: { isActive: true, subscriptionEndsAt: true } },
    },
  });

  const nearby = restos
    .filter((r) => isRestaurantOperative(r, r.account))
    .map((r) => ({
      name: r.name,
      slug: r.slug,
      primaryColor: r.primaryColor,
      logo: r.logo,
      vertical: r.vertical,
      address: r.address,
      distanceKm: haversineKm(lat, lng, r.latitude!, r.longitude!),
    }))
    .filter((r) => r.distanceKm <= MAX_KM)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 50);

  return NextResponse.json(nearby);
}
