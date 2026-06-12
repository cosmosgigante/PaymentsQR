export type PermLevel = "NONE" | "VIEW" | "MANAGE";

// Módulos del sistema que se pueden permitir/restringir por token.
export const MODULES = [
  { key: "PEDIDOS",   label: "Pedidos",     hint: "Ver y gestionar pedidos" },
  { key: "COCINA",    label: "Cocina",      hint: "Panel de cocina en vivo" },
  { key: "MOZOS",     label: "Mozos",       hint: "Entregar y cobrar" },
  { key: "MENU",      label: "Menú",        hint: "Categorías y platos" },
  { key: "MESAS",     label: "Mesas y QR",  hint: "Mesas y códigos QR" },
  { key: "ACTIVIDAD", label: "Actividad",   hint: "Control de personal y ventas" },
  { key: "PROMOS",    label: "Promociones", hint: "Puntos y descuentos" },
] as const;

export type ModuleKey = typeof MODULES[number]["key"];

export const PERM_LEVELS: { key: PermLevel; label: string }[] = [
  { key: "NONE",   label: "Sin acceso" },
  { key: "VIEW",   label: "Ver" },
  { key: "MANAGE", label: "Gestionar" },
];

export type PermissionMatrix = Partial<Record<ModuleKey, PermLevel>>;

const MODULE_KEYS = MODULES.map((m) => m.key) as readonly string[];

export function isPermLevel(v: unknown): v is PermLevel {
  return v === "NONE" || v === "VIEW" || v === "MANAGE";
}

export function parsePermissions(json: string | null | undefined): PermissionMatrix {
  if (!json) return {};
  try {
    const obj = JSON.parse(json);
    return sanitizePermissions(obj);
  } catch {
    return {};
  }
}

/** Deja solo módulos válidos con nivel VIEW/MANAGE (descarta NONE y claves desconocidas). */
export function sanitizePermissions(input: unknown): PermissionMatrix {
  const out: PermissionMatrix = {};
  if (input && typeof input === "object") {
    for (const key of MODULE_KEYS) {
      const v = (input as Record<string, unknown>)[key];
      if (isPermLevel(v) && v !== "NONE") out[key as ModuleKey] = v;
    }
  }
  return out;
}

export const DURATION_OPTIONS = [
  { key: "7",  label: "7 días",          days: 7 },
  { key: "30", label: "30 días",         days: 30 },
  { key: "90", label: "90 días",         days: 90 },
  { key: "0",  label: "Sin vencimiento", days: 0 },
];

export function parseRestaurantIds(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
