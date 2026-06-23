"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, MonitorSmartphone, Pause, Play, Pencil, X, Check } from "lucide-react";
import {
  MODULES, PERM_LEVELS, DURATION_OPTIONS,
  type PermLevel, type PermissionMatrix, type ModuleKey,
} from "@/lib/permissions";
import type { Restaurant } from "./CuentaClient";

type Token = {
  id: string;
  name: string;
  authType: string;
  username: string | null;
  email: string | null;
  permissions: PermissionMatrix;
  restaurantIds: string[];
  maxDevices: number;
  expiresAt: string | null;
  isActive: boolean;
  activeDevices: number;
  createdAt: string;
};

const emptyForm = {
  name: "",
  authType: "PASSWORD" as "PASSWORD" | "GOOGLE",
  username: "",
  email: "",
  permissions: {} as PermissionMatrix,
  restaurantIds: [] as string[],
  maxDevices: 1,
  durationKey: "30",
};

export default function UsersManager({ restaurants }: { restaurants: Restaurant[] }) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ maxDevices: number; permissions: PermissionMatrix; restaurantIds: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [createdCred, setCreatedCred] = useState<{ username: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchTokens = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/account/tokens", { cache: "no-store" });
    if (res.ok) setTokens((await res.json()).tokens);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTokens(); }, [fetchTokens]);

  function setPerm(mod: ModuleKey, level: PermLevel) {
    setForm((f) => {
      const permissions = { ...f.permissions };
      if (level === "NONE") delete permissions[mod];
      else permissions[mod] = level;
      return { ...f, permissions };
    });
  }

  function toggleRestaurant(id: string) {
    setForm((f) => ({
      ...f,
      restaurantIds: f.restaurantIds.includes(id)
        ? f.restaurantIds.filter((x) => x !== id)
        : [...f.restaurantIds, id],
    }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    const durationDays = DURATION_OPTIONS.find((d) => d.key === form.durationKey)?.days ?? 0;
    const res = await fetch("/api/account/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        authType: form.authType,
        username: form.username,
        email: form.email,
        permissions: form.permissions,
        restaurantIds: form.restaurantIds,
        maxDevices: form.maxDevices,
        durationDays,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Error al crear el token"); setCreating(false); return; }
    // Si es acceso por contraseña, el sistema generó una: la mostramos una vez
    if (data.generatedPassword && data.username) {
      setCreatedCred({ username: data.username, password: data.generatedPassword });
      setCopied(false);
    }
    setForm(emptyForm);
    setShowForm(false);
    setCreating(false);
    fetchTokens();
  }

  async function handleToggle(token: Token) {
    setTogglingId(token.id);
    const res = await fetch(`/api/account/tokens/${token.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !token.isActive }),
    });
    if (res.ok) setTokens((prev) => prev.map((t) => t.id === token.id ? { ...t, isActive: !token.isActive } : t));
    setTogglingId(null);
  }

  function startEdit(token: Token) {
    setEditingId(token.id);
    setEditForm({ maxDevices: token.maxDevices, permissions: { ...token.permissions }, restaurantIds: [...token.restaurantIds] });
  }

  async function saveEdit(id: string) {
    if (!editForm) return;
    const res = await fetch(`/api/account/tokens/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      const d = await res.json();
      setTokens((prev) => prev.map((t) => t.id === id ? { ...t, maxDevices: editForm.maxDevices, permissions: editForm.permissions, restaurantIds: editForm.restaurantIds } : t));
      setEditingId(null); setEditForm(null);
    }
  }

  async function handleDelete(id: string) {
    const token = tokens.find((t) => t.id === id);
    if (token?.isActive) { alert("Pausá el acceso antes de eliminarlo"); return; }
    if (!confirm(`¿Eliminar el acceso "${token?.name}"? Esta acción no se puede deshacer.`)) return;
    setDeletingId(id);
    const res = await fetch(`/api/account/tokens/${id}`, { method: "DELETE" });
    if (res.ok) setTokens((prev) => prev.filter((t) => t.id !== id));
    setDeletingId(null);
  }

  const restName = (id: string) => restaurants.find((r) => r.id === id)?.name ?? "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-800">Usuarios y permisos</h2>
          <p className="text-xs text-gray-400">Credenciales de acceso para tu personal (cocina, mozos, encargados…).</p>
        </div>
        <button onClick={() => { setShowForm((v) => !v); setError(null); }}
          className="shrink-0 bg-blue-900 text-white hover:bg-blue-800 text-sm font-semibold px-4 py-2 rounded-xl transition-all">
          + Nuevo acceso
        </button>
      </div>

      {/* Credencial generada — se muestra UNA sola vez */}
      <AnimatePresence>
        {createdCred && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
            <p className="text-sm font-semibold text-emerald-800 mb-2">✅ Acceso creado — guardá estos datos (no se vuelven a mostrar)</p>
            <div className="flex items-center justify-between gap-3 bg-white border border-emerald-200 rounded-xl px-4 py-2.5">
              <div className="font-mono text-sm text-gray-800 min-w-0">
                <span className="text-gray-400">usuario:</span> {createdCred.username}<br />
                <span className="text-gray-400">contraseña:</span> {createdCred.password}
              </div>
              <button onClick={() => {
                  navigator.clipboard.writeText(`usuario: ${createdCred.username}\ncontraseña: ${createdCred.password}`);
                  setCopied(true);
                }}
                className="shrink-0 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-all">
                {copied ? "✓ Copiado" : "Copiar"}
              </button>
            </div>
            <button onClick={() => setCreatedCred(null)} className="text-xs text-emerald-700 hover:text-emerald-900 mt-2 font-medium">
              Ya la guardé, cerrar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Nombre</label>
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="Cocina turno noche"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              </div>

              {/* Tipo de acceso */}
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Tipo de acceso</label>
                <div className="grid grid-cols-2 gap-2">
                  {([["PASSWORD", "Usuario + contraseña"], ["GOOGLE", "Con Google"]] as const).map(([k, label]) => (
                    <button key={k} type="button" onClick={() => setForm((f) => ({ ...f, authType: k }))}
                      className={`text-xs font-semibold px-3 py-2.5 rounded-xl border transition-all ${
                        form.authType === k ? "bg-blue-900 text-white border-blue-900" : "bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300"
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {form.authType === "PASSWORD" ? (
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Usuario</label>
                  <input type="text" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase().replace(/\s+/g, "") }))} required placeholder="cocina-noche"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                  <p className="text-xs text-gray-400 mt-1">La contraseña la genera el sistema al crear el acceso (te la mostramos una vez).</p>
                </div>
              ) : (
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Email de Google del empleado</label>
                  <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required placeholder="empleado@gmail.com"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                  <p className="text-xs text-gray-400 mt-1">Esa persona entra con su cuenta de Google usando este email.</p>
                </div>
              )}

              {/* Matriz de permisos */}
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-widest block mb-2">Permisos</label>
                <div className="space-y-1.5">
                  {MODULES.map((m) => {
                    const current = form.permissions[m.key] ?? "NONE";
                    return (
                      <div key={m.key} className="flex items-center justify-between gap-2 bg-gray-50 rounded-xl px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800">{m.label}</p>
                          <p className="text-[11px] text-gray-400 truncate">{m.hint}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {PERM_LEVELS.map((lvl) => (
                            <button key={lvl.key} type="button" onClick={() => setPerm(m.key, lvl.key)}
                              className={`text-[11px] font-semibold px-2 py-1 rounded-lg border transition-all ${
                                current === lvl.key
                                  ? lvl.key === "NONE" ? "bg-gray-200 text-gray-600 border-gray-300"
                                    : lvl.key === "VIEW" ? "bg-blue-100 text-blue-700 border-blue-200"
                                    : "bg-emerald-100 text-emerald-700 border-emerald-200"
                                  : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                              }`}>
                              {lvl.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Restoranes asignados */}
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-widest block mb-2">Restoranes asignados</label>
                <div className="flex flex-wrap gap-2">
                  {restaurants.map((r) => {
                    const on = form.restaurantIds.includes(r.id);
                    return (
                      <button key={r.id} type="button" onClick={() => toggleRestaurant(r.id)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                          on ? "bg-blue-900 text-white border-blue-900" : "bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300"
                        }`}>
                        {r.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Dispositivos</label>
                  <input type="number" min={1} max={10} value={form.maxDevices}
                    onChange={(e) => setForm((f) => ({ ...f, maxDevices: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)) }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Vencimiento</label>
                  <select value={form.durationKey} onChange={(e) => setForm((f) => ({ ...f, durationKey: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                    {DURATION_OPTIONS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
                  </select>
                </div>
              </div>

              {error && <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

              <div className="flex gap-2">
                <button type="submit" disabled={creating}
                  className="bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 font-semibold text-sm px-4 py-2.5 rounded-xl transition-all">
                  {creating ? "Creando..." : "Crear acceso"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setError(null); }}
                  className="text-gray-500 hover:text-gray-900 text-sm px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-all">
                  Cancelar
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de tokens */}
      {loading ? (
        <p className="text-gray-400 text-sm text-center py-6">Cargando…</p>
      ) : tokens.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="text-3xl mb-2">🔑</div>
          <p className="text-gray-500 text-sm font-medium">Todavía no creaste accesos</p>
          <p className="text-gray-300 text-xs mt-1">Creá uno para tu personal con "+ Nuevo acceso"</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tokens.map((t) => {
            const expired = t.expiresAt && new Date(t.expiresAt) < new Date();
            return (
              <div key={t.id} className={`bg-white rounded-2xl border p-4 shadow-sm transition-all ${!t.isActive ? "border-gray-200 opacity-70" : "border-gray-100"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{t.name}</span>
                      <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        {t.authType === "GOOGLE" ? `G · ${t.email}` : t.username}
                      </span>
                      {!t.isActive && <span className="text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">Pausado</span>}
                      {expired && <span className="text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">Vencido</span>}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {MODULES.filter((m) => t.permissions[m.key]).map((m) => (
                        <span key={m.key} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          t.permissions[m.key] === "MANAGE" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}>
                          {m.label}: {t.permissions[m.key] === "MANAGE" ? "Gestionar" : "Ver"}
                        </span>
                      ))}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-2">
                      {t.restaurantIds.length === 1 ? restName(t.restaurantIds[0]) : `${t.restaurantIds.length} restoranes`}
                      {" · "}
                      <span className="inline-flex items-center gap-0.5"><MonitorSmartphone size={11} /> {t.activeDevices}/{t.maxDevices}</span>
                      {t.expiresAt && ` · vence ${new Date(t.expiresAt).toLocaleDateString("es-AR")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleToggle(t)} disabled={togglingId === t.id} title={t.isActive ? "Pausar" : "Reactivar"}
                      className={`p-2 rounded-lg transition-all disabled:opacity-50 ${t.isActive ? "text-amber-500 hover:bg-amber-50" : "text-emerald-500 hover:bg-emerald-50"}`}>
                      {t.isActive ? <Pause size={15} /> : <Play size={15} />}
                    </button>
                    <button onClick={() => editingId === t.id ? (setEditingId(null), setEditForm(null)) : startEdit(t)}
                      title="Editar" className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                      {editingId === t.id ? <X size={15} /> : <Pencil size={15} />}
                    </button>
                    <button onClick={() => handleDelete(t.id)} disabled={deletingId === t.id || t.isActive}
                      title={t.isActive ? "Pausá el acceso antes de eliminar" : "Eliminar"}
                      className="p-2 rounded-lg text-red-400/60 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Panel de edición inline */}
                {editingId === t.id && editForm && (
                  <div className="mt-4 border-t border-gray-100 pt-4 space-y-3">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Editar acceso (nombre y usuario no se pueden cambiar)</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Dispositivos</label>
                        <input type="number" min={1} max={10} value={editForm.maxDevices}
                          onChange={(e) => setEditForm((f) => f ? { ...f, maxDevices: Math.min(10, Math.max(1, parseInt(e.target.value) || 1)) } : f)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Permisos</label>
                      <div className="space-y-1">
                        {MODULES.map((m) => (
                          <div key={m.key} className="flex items-center justify-between gap-2">
                            <span className="text-xs text-gray-700">{m.label}</span>
                            <select value={editForm.permissions[m.key] ?? "NONE"}
                              onChange={(e) => setEditForm((f) => f ? { ...f, permissions: { ...f.permissions, [m.key]: e.target.value as PermLevel } } : f)}
                              className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none">
                              {PERM_LEVELS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                    {restaurants.length > 1 && (
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Restoranes asignados</label>
                        <div className="space-y-1">
                          {restaurants.map((r) => (
                            <label key={r.id} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                              <input type="checkbox" checked={editForm.restaurantIds.includes(r.id)}
                                onChange={(e) => setEditForm((f) => f ? { ...f, restaurantIds: e.target.checked ? [...f.restaurantIds, r.id] : f.restaurantIds.filter((id) => id !== r.id) } : f)} />
                              {r.name}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    <button onClick={() => saveEdit(t.id)} className="flex items-center gap-1.5 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-700">
                      <Check size={14} /> Guardar cambios
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
