"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Plus, Building2, CheckCircle, Clock, LogOut } from "lucide-react";
import { PLANS, formatArs, type PlanType } from "@/lib/plans";

type Org = {
  id: string; name: string | null; ownerEmail: string; isOwner: boolean;
  planType: string | null; isActive: boolean; membershipActive: boolean;
  subscriptionEndsAt: string | null; pendingPlanType: string | null;
  restaurantCount: number;
};

type Invitation = {
  id: string;
  account: { id: string; name: string | null; ownerEmail: string };
  inviterEmail: string;
};

export default function PerfilClient({ email, avatarUrl, displayName }: { email: string; avatarUrl: string | null; displayName: string }) {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [orgsRes, invRes] = await Promise.all([
      fetch("/api/orgs", { cache: "no-store" }),
      fetch("/api/orgs/pending-invites", { cache: "no-store" }),
    ]);
    if (orgsRes.ok) { const d = await orgsRes.json(); setOrgs(d.orgs ?? []); }
    if (invRes.ok) { const d = await invRes.json(); setInvitations(d.invitations ?? []); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function createOrg(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true); setCreateError(null);
    const r = await fetch("/api/orgs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: orgName }),
    });
    const d = await r.json();
    setCreating(false);
    if (!r.ok) { setCreateError(d.error ?? "Error"); return; }
    setShowCreate(false); setOrgName("");
    await load();
  }

  async function acceptInvite(invId: string, orgId: string) {
    await fetch(`/api/orgs/${orgId}/invite/respond`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId: invId, action: "accept" }),
    });
    await load();
  }

  async function rejectInvite(invId: string, orgId: string) {
    await fetch(`/api/orgs/${orgId}/invite/respond`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId: invId, action: "reject" }),
    });
    await load();
  }

  async function enterOrg(org: Org) {
    // Guardar org seleccionada en cookie para que /cuenta sepa cuál mostrar
    await fetch("/api/orgs/select", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId: org.id }),
    });
    router.push("/cuenta");
  }

  async function signOut() {
    await fetch("/api/auth/login", { method: "DELETE" });
    await createClient().auth.signOut();
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="relative overflow-hidden px-4 sm:px-6 pb-6"
        style={{ background: "linear-gradient(135deg, #1e2d4e 0%, #1a3a6b 60%, #1e3a8a 100%)", paddingTop: "max(1.5rem, env(safe-area-inset-top))" }}>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            {/* Mi Perfil widget */}
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <img src={avatarUrl} alt="foto" className="w-10 h-10 rounded-xl object-cover border-2 border-white/20" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                  {email[0].toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-white font-semibold text-sm leading-tight truncate max-w-[180px]">{displayName}</p>
                <p className="text-white/50 text-[11px] truncate max-w-[180px]">{email}</p>
              </div>
            </div>
            <button onClick={signOut} className="text-white/50 hover:text-white transition-colors p-2 rounded-xl hover:bg-white/10">
              <LogOut size={16} />
            </button>
          </div>
          <h1 className="text-white font-bold text-2xl">Mis organizaciones</h1>
          <p className="text-white/50 text-sm mt-1">Seleccioná una para ingresar o creá una nueva.</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* Invitaciones pendientes */}
        {invitations.map((inv) => (
          <div key={inv.id} className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-semibold text-amber-900 text-sm">Invitación a <span className="font-bold">{inv.account.name ?? inv.account.ownerEmail}</span></p>
              <p className="text-amber-600 text-xs mt-0.5">Invitado por {inv.inviterEmail}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => acceptInvite(inv.id, inv.account.id)} className="bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl">Aceptar</button>
              <button onClick={() => rejectInvite(inv.id, inv.account.id)} className="bg-white border border-gray-200 text-gray-600 text-xs font-semibold px-3 py-1.5 rounded-xl">Rechazar</button>
            </div>
          </div>
        ))}

        {/* Lista de orgs */}
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" /></div>
        ) : (
          <>
            {orgs.length === 0 && !showCreate && (
              <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center shadow-sm">
                <Building2 size={36} className="text-gray-300 mx-auto mb-3" />
                <p className="font-semibold text-gray-800">Todavía no tenés ninguna organización</p>
                <p className="text-gray-400 text-sm mt-1">Creá una gratis para empezar. Después activás la membresía.</p>
                <button onClick={() => setShowCreate(true)} className="mt-4 bg-blue-900 text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-800">
                  Crear organización
                </button>
              </div>
            )}

            {orgs.map((org) => (
              <div key={org.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    <Building2 size={18} className="text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{org.name ?? "Sin nombre"}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {org.membershipActive ? (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                          <CheckCircle size={11} />Membresía activa
                        </span>
                      ) : org.pendingPlanType ? (
                        <span className="flex items-center gap-1 text-[11px] text-amber-600 font-semibold">
                          <Clock size={11} />Membresía pendiente de aprobación
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400">Sin membresía</span>
                      )}
                      {org.restaurantCount > 0 && (
                        <span className="text-[11px] text-gray-400">· {org.restaurantCount} restorán{org.restaurantCount > 1 ? "es" : ""}</span>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={() => enterOrg(org)}
                  className="bg-blue-900 text-white hover:bg-blue-800 text-sm font-semibold px-4 py-2 rounded-xl transition-all shrink-0">
                  Ingresar
                </button>
              </div>
            ))}

            {orgs.length > 0 && (
              <button onClick={() => setShowCreate((v) => !v)} className="w-full bg-white border border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-700 text-sm font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all">
                <Plus size={16} />Nueva organización
              </button>
            )}
          </>
        )}

        {/* Form crear org */}
        {showCreate && (
          <form onSubmit={createOrg} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="font-semibold text-gray-800">Nueva organización</h3>
            <p className="text-gray-400 text-xs">Crear la organización es gratis. Activás la membresía desde adentro.</p>
            <input required value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Nombre de la organización o negocio"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            {createError && <p className="text-red-500 text-xs">{createError}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={creating} className="bg-blue-900 text-white font-semibold text-sm px-4 py-2.5 rounded-xl disabled:opacity-50">
                {creating ? "Creando..." : "Crear"}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="text-gray-500 text-sm px-4 py-2.5 rounded-xl">Cancelar</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
