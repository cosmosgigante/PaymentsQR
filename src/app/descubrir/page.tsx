import { redirect } from "next/navigation";

// El descubrimiento se unificó dentro del portal de clientes (/mi, pestaña Descubrir).
// Mantenemos /descubrir como atajo que redirige, para no romper links viejos.
export default function DescubrirRedirect() {
  redirect("/mi?tab=descubrir");
}
