"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Users, Bell, BarChart2, MessageCircle, Menu, X, LogOut, Activity, CreditCard, Building2 } from "lucide-react";
import PanelBoundary from "@/components/setup/PanelBoundary";
import ClientesPanel from "./panels/ClientesPanel";
import TrazabilidadPanel from "./panels/TrazabilidadPanel";
import MembresiasPanel from "./panels/MembresiasPanel";
import OrganizacionesPanel from "./panels/OrganizacionesPanel";
import PlaceholderPanel from "./panels/PlaceholderPanel";

const SECTIONS = [
  { key: "clientes",        label: "Clientes",        icon: Users },
  { key: "organizaciones",  label: "Organizaciones",  icon: Building2 },
  { key: "membresias",      label: "Membresías",      icon: CreditCard },
  { key: "trazabilidad",    label: "Trazabilidad",    icon: Activity },
  { key: "notificaciones",  label: "Notificaciones",  icon: Bell },
  { key: "analytics",       label: "Analytics",       icon: BarChart2 },
  { key: "soporte",         label: "Soporte",         icon: MessageCircle },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

export default function SuperAdminPage() {
  const router = useRouter();
  const [active, setActive] = useState<SectionKey>("clientes");
  const [navOpen, setNavOpen] = useState(false);
  const [pendingMemberships, setPendingMemberships] = useState(0);

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
  }

  const section = SECTIONS.find((s) => s.key === active)!;

  return (
    <div className="min-h-screen bg-slate-100 flex">

      {/* ── Sidebar ── */}
      {/* Overlay móvil */}
      {navOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setNavOpen(false)} />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-40 w-60 flex flex-col
        bg-[#1e2d4e] text-white shadow-xl
        transform transition-transform duration-200
        ${navOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 lg:static lg:z-auto
      `} style={{ paddingTop: "env(safe-area-inset-top)" }}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white/15 rounded-xl flex items-center justify-center text-base">🍽️</div>
            <div>
              <p className="font-bold text-sm leading-none">PaymentsQR</p>
              <p className="text-white/50 text-[10px] mt-0.5">Panel Superadmin</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const isActive = active === s.key;
            return (
              <button key={s.key} onClick={() => { setActive(s.key); setNavOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                  isActive ? "bg-white/15 text-white" : "text-white/60 hover:text-white hover:bg-white/8"
                }`}>
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                <span className="flex-1">{s.label}</span>
                {s.key === "membresias" && pendingMemberships > 0 && (
                  <span className="bg-amber-400 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {pendingMemberships}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-white/10">
          <button onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/10 transition-all">
            <LogOut size={16} />Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Contenido ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar móvil */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-20"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
          <button onClick={() => setNavOpen(true)} className="p-1.5 rounded-lg hover:bg-gray-100">
            {navOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <span className="font-semibold text-gray-900 text-sm">{section.label}</span>
        </header>

        <main className="flex-1 p-5 lg:p-8 max-w-4xl w-full mx-auto">
          <PanelBoundary name={section.label}>
            {active === "clientes"       && <ClientesPanel />}
            {active === "organizaciones" && <OrganizacionesPanel />}
            {active === "membresias"     && <MembresiasPanel onPendingCount={setPendingMemberships} />}
            {active === "trazabilidad"   && <TrazabilidadPanel />}
            {active === "notificaciones" && <PlaceholderPanel name="Notificaciones" description="Invitaciones a sociedades y cambios de permisos a tokens. Próximamente." />}
            {active === "analytics"      && <PlaceholderPanel name="Analytics" description="Actividad por negocio, usuario y grupo societario. Próximamente." />}
            {active === "soporte"        && <PlaceholderPanel name="Soporte" description="Chat privado con cada Cliente A. Próximamente." />}
          </PanelBoundary>
        </main>
      </div>
    </div>
  );
}
