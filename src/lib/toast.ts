// Toast global sin dependencias: pub/sub a nivel módulo. Cualquier código llama
// `toast("mensaje")` (como alert, pero in-app y NO bloqueante). El <Toaster/>
// montado en el layout lo escucha y lo muestra. Reemplaza los alert() nativos.

export type ToastType = "info" | "error" | "success";
export type ToastMsg = { id: number; text: string; type: ToastType };

type Listener = (t: ToastMsg) => void;
const listeners = new Set<Listener>();
let seq = 0;

export function toast(text: string, type: ToastType = "info") {
  const t: ToastMsg = { id: ++seq, text, type };
  listeners.forEach((fn) => fn(t));
}

export function subscribeToast(fn: Listener) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
