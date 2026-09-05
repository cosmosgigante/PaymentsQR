import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// Proxy a Nominatim (OpenStreetMap) para geocoding/autocompletado de lugares y
// direcciones. Server-side para respetar la política de uso (User-Agent propio,
// idioma) y evitar CORS. Lo usan: Ajustes del negocio (dirección → coordenadas) y
// el buscador del portal (autocompletar ciudad/zona). Gratis, sin API key.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 3) return NextResponse.json([]);

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!(await rateLimit(`geo:${ip}`, 40, 60 * 1000))) {
    return NextResponse.json({ error: "Demasiadas búsquedas, esperá un momento" }, { status: 429 });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&q=${encodeURIComponent(q)}`;
    const r = await fetch(url, {
      headers: { "User-Agent": "PaymentsQR/1.0 (soporte@paymentsqr.app)", "Accept-Language": "es" },
    });
    if (!r.ok) return NextResponse.json([]);
    const data = await r.json();
    type NomItem = { display_name: string; lat: string; lon: string; type?: string; address?: Record<string, string> };
    const results = (Array.isArray(data) ? (data as NomItem[]) : []).map((d) => {
      const a = d.address ?? {};
      return {
        displayName: d.display_name,
        lat: parseFloat(d.lat),
        lng: parseFloat(d.lon),
        type: d.type ?? "",
        city: a.city ?? a.town ?? a.village ?? a.county ?? null,
        country: a.country ?? null,
      };
    });
    return NextResponse.json(results);
  } catch {
    return NextResponse.json([]);
  }
}
