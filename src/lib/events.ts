// Server-Sent Events — sin dependencias externas
type Listener = (data: unknown) => void;

const listeners = new Map<string, Set<Listener>>();

export function subscribe(restaurantId: string, fn: Listener) {
  if (!listeners.has(restaurantId)) listeners.set(restaurantId, new Set());
  listeners.get(restaurantId)!.add(fn);
  return () => listeners.get(restaurantId)?.delete(fn);
}

export function emitEvent(restaurantId: string, data: unknown) {
  listeners.get(restaurantId)?.forEach((fn) => fn(data));
}
