"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";

type Mod = { key: string; label: string; href: string; emoji: string };

export default function TrabajoClient({
  restaurantName, accessName, modules,
}: { restaurantName: string; accessName: string; modules: Mod[] }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/staff/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="relative overflow-hidden px-4 sm:px-6 pb-8"
        style={{ background: "linear-gradient(135deg, #1e2d4e 0%, #1a3a6b 60%, #1e3a8a 100%)", paddingTop: "max(1.5rem, env(safe-area-inset-top))" }}>
        <div className="relative max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-lg backdrop-blur-sm">🧑‍🍳</div>
              <span className="font-bold text-white text-lg tracking-tight">Panel de trabajo</span>
            </div>
            <button onClick={logout} className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm transition-colors px-2 min-h-[44px]">
              <LogOut size={15} strokeWidth={2} />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
          <h1 className="text-white font-bold text-2xl">{restaurantName}</h1>
          <p className="text-white/50 text-sm mt-1">Acceso: {accessName}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {modules.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <div className="text-3xl mb-2">🔒</div>
            <p className="text-gray-500 text-sm font-medium">Tu acceso no tiene módulos asignados</p>
            <p className="text-gray-300 text-xs mt-1">Pedile al administrador que te habilite permisos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {modules.map((m) => (
              <Link key={m.key} href={m.href}
                className="bg-white rounded-2xl border border-gray-100 hover:border-blue-300 shadow-sm p-5 flex flex-col items-center justify-center gap-2 transition-all min-h-[120px]">
                <span className="text-3xl">{m.emoji}</span>
                <span className="font-semibold text-gray-800 text-sm">{m.label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
