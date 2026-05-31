import { redirect } from "next/navigation";

// La raíz redirige al panel admin
// Si no hay sesión, el middleware manda al login
export default function Home() {
  redirect("/admin");
}
