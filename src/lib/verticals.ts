// Catálogo de verticales (categorías de negocio). Sin dependencias de servidor
// (db) — se importa tanto desde APIs como desde componentes cliente.
//
// FEATURE ≠ VERTICAL: el vertical es el TIPO de negocio. Las features (turnero,
// catálogo, pedido-retiro, etc.) se encienden por vertical, no son categorías.

export type VerticalKey = "GASTRONOMICO" | "KIOSCO_DESPENSA";

export type VerticalMeta = {
  key: VerticalKey;
  label: string;
  emoji: string;
  description: string;
  defaultSubtype: string;
  subtypes: { key: string; label: string }[];
};

export const VERTICALS: VerticalMeta[] = [
  {
    key: "GASTRONOMICO",
    label: "Gastronómico",
    emoji: "🍽️",
    description: "Bar, restorán, café — mesas, cocina y mozos.",
    defaultSubtype: "BAR_RESTO",
    subtypes: [{ key: "BAR_RESTO", label: "Bar / Restorán" }],
  },
  {
    key: "KIOSCO_DESPENSA",
    label: "Kiosco / Despensa",
    emoji: "🏪",
    description: "Catálogo y pedí-y-retirá. Más directo, sin mesas.",
    defaultSubtype: "KIOSCO",
    subtypes: [
      { key: "KIOSCO", label: "Kiosco" },
      { key: "DESPENSA", label: "Despensa" },
    ],
  },
];

export const VERTICAL_KEYS = VERTICALS.map((v) => v.key);

export function verticalMeta(key: string): VerticalMeta {
  return VERTICALS.find((v) => v.key === key) ?? VERTICALS[0];
}

export function verticalLabel(key: string): string {
  return verticalMeta(key).label;
}

export function isValidVertical(key: unknown): key is VerticalKey {
  return typeof key === "string" && (VERTICAL_KEYS as string[]).includes(key);
}

// Devuelve el subtipo válido para un vertical (cae al default si no corresponde).
export function resolveSubtype(vertical: string, subtype: unknown): string {
  const meta = verticalMeta(vertical);
  if (typeof subtype === "string" && meta.subtypes.some((s) => s.key === subtype)) return subtype;
  return meta.defaultSubtype;
}
