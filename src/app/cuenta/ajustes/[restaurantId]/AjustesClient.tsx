"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, CreditCard, Workflow, ShieldCheck, Users, Store, Upload, X } from "lucide-react";

type MP = {
  enabled: boolean;
  hasToken: boolean;
  tokenHint: string | null;
  publicKey: string | null;
  accountName: string | null;
};

type Ops = {
  confirmTableEnabled: boolean; maxTableDevices: number;
  flowConfirmEnabled: boolean; flowDeliveredEnabled: boolean;
  waitlistEnabled: boolean; waitlistEstimatedWait: number; waitlistExpiryMinutes: number;
};

export default function AjustesClient({
  restaurantId, restaurantName, restaurantSlug, restaurantLogo, mercadopago, operations,
}: { restaurantId: string; restaurantName: string; restaurantSlug: string; restaurantLogo: string | null; mercadopago: MP; operations: Ops }) {
  // Datos del restaurante
  const [rName, setRName] = useState(restaurantName);
  const [rSlug, setRSlug] = useState(restaurantSlug);
  const [rLogo, setRLogo] = useState<string | null>(restaurantLogo);
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  async function uploadLogo(file: File) {
    setUploadingLogo(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    if (res.ok) {
      const { url } = await res.json();
      setRLogo(url);
    }
    setUploadingLogo(false);
  }

  async function saveInfo() {
    setSavingInfo(true); setInfoMsg(null);
    const slug = rSlug.toLowerCase().replace(/[^a-z0-9-]/g, "");
    const res = await fetch(`/api/account/restaurants/${restaurantId}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: rName, slug, logo: rLogo }),
    });
    setSavingInfo(false);
    if (res.ok) {
      setInfoMsg("Guardado ✓");
      setRSlug(slug);
    } else {
      const d = await res.json().catch(() => ({ error: "Error al guardar" }));
      setInfoMsg(d.error ?? "Error al guardar");
    }
    setTimeout(() => setInfoMsg(null), 4000);
  }

  const [enabled, setEnabled] = useState(mercadopago.enabled);
  const [replacing, setReplacing] = useState(!mercadopago.hasToken);
  const [accessToken, setAccessToken] = useState("");
  const [publicKey, setPublicKey] = useState(mercadopago.publicKey ?? "");
  const [hasToken, setHasToken] = useState(mercadopago.hasToken);
  const [hint, setHint] = useState(mercadopago.tokenHint);
  const [accountName, setAccountName] = useState(mercadopago.accountName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Flujo operativo
  const [confirmTable, setConfirmTable] = useState(operations.confirmTableEnabled);
  const [maxDevices, setMaxDevices] = useState(operations.maxTableDevices);
  const [flowConfirm, setFlowConfirm] = useState(operations.flowConfirmEnabled);
  const [flowDelivered, setFlowDelivered] = useState(operations.flowDeliveredEnabled);
  const [savingOps, setSavingOps] = useState(false);
  const [opsMsg, setOpsMsg] = useState<string | null>(null);

  // Lista de espera
  const [waitlistEnabled, setWaitlistEnabled] = useState(operations.waitlistEnabled);
  const [waitlistWait, setWaitlistWait] = useState(operations.waitlistEstimatedWait);
  const [waitlistExpiry, setWaitlistExpiry] = useState(operations.waitlistExpiryMinutes);
  const [savingWaitlist, setSavingWaitlist] = useState(false);
  const [waitlistMsg, setWaitlistMsg] = useState<string | null>(null);

  async function saveOps() {
    setSavingOps(true); setOpsMsg(null);
    const res = await fetch(`/api/account/restaurants/${restaurantId}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmTableEnabled: confirmTable, maxTableDevices: maxDevices, flowConfirmEnabled: flowConfirm, flowDeliveredEnabled: flowDelivered }),
    });
    setSavingOps(false);
    setOpsMsg(res.ok ? "Guardado ✓" : "Error al guardar");
    setTimeout(() => setOpsMsg(null), 4000);
  }

  async function saveWaitlist() {
    setSavingWaitlist(true); setWaitlistMsg(null);
    const res = await fetch(`/api/account/restaurants/${restaurantId}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ waitlistEnabled, waitlistEstimatedWait: waitlistWait, waitlistExpiryMinutes: waitlistExpiry }),
    });
    setSavingWaitlist(false);
    setWaitlistMsg(res.ok ? "Guardado ✓" : "Error al guardar");
    setTimeout(() => setWaitlistMsg(null), 4000);
  }

  async function save() {
    setSaving(true); setError(null); setSuccess(null);
    const res = await fetch(`/api/account/restaurants/${restaurantId}/payments`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled, accessToken: accessToken.trim() || undefined, publicKey }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Error al guardar"); setSaving(false); return; }
    // Re-leer el estado enmascarado actualizado
    const g = await (await fetch(`/api/account/restaurants/${restaurantId}/payments`, { cache: "no-store" })).json();
    setHasToken(g.mercadopago.hasToken); setHint(g.mercadopago.tokenHint); setAccountName(g.mercadopago.accountName);
    setAccessToken(""); setReplacing(!g.mercadopago.hasToken);
    setSuccess("Guardado ✓");
    setTimeout(() => setSuccess(null), 4000);
    setSaving(false);
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="px-4 sm:px-6 pb-6"
        style={{ background: "linear-gradient(135deg, #1e2d4e 0%, #1a3a6b 60%, #1e3a8a 100%)", paddingTop: "max(1.5rem, env(safe-area-inset-top))" }}>
        <div className="max-w-3xl mx-auto">
          <Link href="/cuenta" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-3">
            <ArrowLeft size={16} /> Volver
          </Link>
          <h1 className="text-white font-bold text-2xl">Ajustes</h1>
          <p className="text-white/50 text-sm mt-1">{restaurantName}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Datos del restaurante */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <Store size={18} className="text-blue-700" />
            <h2 className="font-semibold text-gray-800">Datos del restaurante</h2>
          </div>
          <p className="text-sm text-gray-400 mb-4">Nombre, URL y logo de tu restaurante.</p>

          <div className="space-y-4">
            {/* Logo */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-widest block mb-2">Logo</label>
              <div className="flex items-center gap-4">
                {rLogo ? (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 shrink-0">
                    <img src={rLogo} alt="Logo" className="w-full h-full object-cover" />
                    <button onClick={() => setRLogo(null)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 shrink-0">
                    <Store size={24} />
                  </div>
                )}
                <div>
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }} />
                  <button onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}
                    className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-xl transition-all disabled:opacity-50">
                    <Upload size={14} /> {uploadingLogo ? "Subiendo..." : rLogo ? "Cambiar" : "Subir logo"}
                  </button>
                  <p className="text-[11px] text-gray-400 mt-1">Recomendado: cuadrado, mín. 200×200px</p>
                </div>
              </div>
            </div>

            {/* Nombre */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Nombre</label>
              <input type="text" value={rName} onChange={(e) => setRName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-gray-300" />
            </div>

            {/* Slug/URL */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">URL</label>
              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 gap-1">
                <span className="text-gray-400 text-sm font-mono">/</span>
                <input type="text" value={rSlug}
                  onChange={(e) => setRSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  className="flex-1 bg-transparent text-gray-900 text-sm focus:outline-none placeholder:text-gray-300 font-mono" />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Solo letras minúsculas, números y guiones</p>
            </div>
          </div>

          {infoMsg && <p className={`text-sm mt-3 ${infoMsg.includes("✓") ? "text-emerald-600" : "text-red-500"}`}>{infoMsg}</p>}
          <button onClick={saveInfo} disabled={savingInfo || rName.trim().length < 2}
            className="mt-4 bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 font-semibold text-sm px-4 py-2.5 rounded-xl transition-all">
            {savingInfo ? "Guardando..." : "Guardar"}
          </button>
        </section>

        {/* Métodos de cobro */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard size={18} className="text-emerald-600" />
            <h2 className="font-semibold text-gray-800">Métodos de cobro</h2>
          </div>
          <p className="text-sm text-gray-400 mb-4">Configurá cómo cobrás los pagos online. La plata va directo a tu cuenta.</p>

          {/* MercadoPago */}
          <div className="border border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-800">MercadoPago</span>
                {hasToken && (
                  <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Conectado
                  </span>
                )}
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-gray-500">Cobro online</span>
                <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="w-4 h-4 accent-emerald-600" />
              </label>
            </div>

            {hasToken && accountName && (
              <p className="text-xs text-gray-500 mb-3">Cuenta: <strong>{accountName}</strong> · token {hint}</p>
            )}

            {hasToken && !replacing ? (
              <button onClick={() => setReplacing(true)} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                Reemplazar token
              </button>
            ) : (
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Access Token</label>
                  <input type="password" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="APP_USR-..."
                    autoComplete="off"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Lo sacás de MercadoPago → "Tu negocio" → Credenciales. Se guarda cifrado; no se vuelve a mostrar.
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Public Key (opcional)</label>
                  <input type="text" value={publicKey} onChange={(e) => setPublicKey(e.target.value)} placeholder="APP_USR-... (pública)"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                </div>
                {hasToken && (
                  <button onClick={() => { setReplacing(false); setAccessToken(""); }} className="text-xs text-gray-500 hover:text-gray-800">
                    Cancelar reemplazo
                  </button>
                )}
              </div>
            )}
          </div>

          {error && <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3">{error}</p>}
          {success && <p className="text-emerald-600 text-sm mt-3">{success}</p>}

          <button onClick={save} disabled={saving}
            className="mt-4 bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 font-semibold text-sm px-4 py-2.5 rounded-xl transition-all">
            {saving ? "Guardando..." : "Guardar"}
          </button>

          <div className="flex items-start gap-2 mt-4 text-[11px] text-gray-400">
            <ShieldCheck size={14} className="text-emerald-500 shrink-0 mt-0.5" />
            <span>Tu token se guarda cifrado (AES-256). Nunca se muestra completo ni se expone al navegador.</span>
          </div>
        </section>

        {/* Flujo operativo */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <Workflow size={18} className="text-blue-700" />
            <h2 className="font-semibold text-gray-800">Flujo operativo</h2>
          </div>
          <p className="text-sm text-gray-400 mb-4">Cómo se maneja cada mesa durante el servicio.</p>

          {/* Confirmar mesa */}
          <div className="border border-gray-100 rounded-xl p-4 mb-3">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <span className="font-semibold text-gray-800 text-sm">Confirmar mesa antes de pedir</span>
                <p className="text-xs text-gray-400 mt-0.5">
                  La mesa queda en &quot;Esperando confirmación&quot; hasta que un mozo la confirme
                  (al traer el pedido mínimo). Evita pedidos falsos.
                </p>
              </div>
              <input type="checkbox" checked={confirmTable} onChange={(e) => setConfirmTable(e.target.checked)} className="w-4 h-4 accent-blue-600 shrink-0" />
            </label>
          </div>

          {/* Máx dispositivos */}
          <div className="border border-gray-100 rounded-xl p-4">
            <label className="flex items-center justify-between gap-3">
              <div>
                <span className="font-semibold text-gray-800 text-sm">Dispositivos por mesa</span>
                <p className="text-xs text-gray-400 mt-0.5">Cuántos celulares pueden pedir desde la misma mesa a la vez.</p>
              </div>
              <input type="number" min={1} max={10} value={maxDevices}
                onChange={(e) => setMaxDevices(Number(e.target.value))}
                className="w-16 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500/30 shrink-0" />
            </label>
          </div>

          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pt-1">Pasos del flujo de órdenes</p>

          {/* Paso Confirmación */}
          <div className="border border-gray-100 rounded-xl p-4">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <span className="font-semibold text-gray-800 text-sm">Confirmación de recepción</span>
                <p className="text-xs text-gray-400 mt-0.5">
                  {flowConfirm
                    ? "Cocina debe confirmar que recibió la orden antes de preparar."
                    : "Sin confirmación — la orden va directo a Preparando al llegar."}
                </p>
                <p className="text-[11px] text-gray-300 mt-0.5 font-mono">
                  {flowConfirm ? "PENDIENTE → Confirmado → Preparando" : "PENDIENTE → Preparando"}
                </p>
              </div>
              <input type="checkbox" checked={flowConfirm} onChange={(e) => setFlowConfirm(e.target.checked)} className="w-4 h-4 accent-blue-600 shrink-0" />
            </label>
          </div>

          {/* Paso Entregado */}
          <div className="border border-gray-100 rounded-xl p-4">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <span className="font-semibold text-gray-800 text-sm">Paso de entrega</span>
                <p className="text-xs text-gray-400 mt-0.5">
                  {flowDelivered
                    ? "El mozo marca 'Entregado' antes de que caja lo cierre como pagado."
                    : "Sin paso de entrega — al estar Listo pasa directo a Cobrar."}
                </p>
                <p className="text-[11px] text-gray-300 mt-0.5 font-mono">
                  {flowDelivered ? "Listo → Entregado → Pagado" : "Listo → Pagado"}
                </p>
              </div>
              <input type="checkbox" checked={flowDelivered} onChange={(e) => setFlowDelivered(e.target.checked)} className="w-4 h-4 accent-blue-600 shrink-0" />
            </label>
          </div>

          {opsMsg && <p className={`text-sm mt-3 ${opsMsg.includes("✓") ? "text-emerald-600" : "text-red-500"}`}>{opsMsg}</p>}
          <button onClick={saveOps} disabled={savingOps}
            className="mt-4 bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 font-semibold text-sm px-4 py-2.5 rounded-xl transition-all">
            {savingOps ? "Guardando..." : "Guardar"}
          </button>
        </section>

        {/* Lista de espera */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <Users size={18} className="text-violet-600" />
            <h2 className="font-semibold text-gray-800">Lista de espera</h2>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Para lugares con demanda: el cliente escanea el QR de la puerta, se anota y ve su posición.
            Desde el panel de mozos llamás a cada grupo y le asignás mesa.
          </p>

          {/* Activar */}
          <div className="border border-gray-100 rounded-xl p-4 mb-3">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <span className="font-semibold text-gray-800 text-sm">Activar lista de espera</span>
                <p className="text-xs text-gray-400 mt-0.5">
                  {waitlistEnabled
                    ? "Los clientes pueden anotarse desde el QR de la puerta."
                    : "Desactivada — el QR muestra que no está disponible. También se puede prender/apagar desde el panel de mozos."}
                </p>
              </div>
              <input type="checkbox" checked={waitlistEnabled} onChange={(e) => setWaitlistEnabled(e.target.checked)} className="w-4 h-4 accent-violet-600 shrink-0" />
            </label>
          </div>

          {/* Minutos por persona */}
          <div className="border border-gray-100 rounded-xl p-4 mb-3">
            <label className="flex items-center justify-between gap-3">
              <div>
                <span className="font-semibold text-gray-800 text-sm">Espera estimada por grupo</span>
                <p className="text-xs text-gray-400 mt-0.5">Minutos que se suman por cada grupo adelante en la cola.</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <input type="number" min={1} max={120} value={waitlistWait}
                  onChange={(e) => setWaitlistWait(Number(e.target.value))}
                  className="w-16 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
                <span className="text-xs text-gray-400">min</span>
              </div>
            </label>
          </div>

          {/* Minutos para ocupar tras el llamado */}
          <div className="border border-gray-100 rounded-xl p-4">
            <label className="flex items-center justify-between gap-3">
              <div>
                <span className="font-semibold text-gray-800 text-sm">Tiempo para ocupar tras el llamado</span>
                <p className="text-xs text-gray-400 mt-0.5">Si no llega en este tiempo, el lugar se libera automáticamente.</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <input type="number" min={1} max={30} value={waitlistExpiry}
                  onChange={(e) => setWaitlistExpiry(Number(e.target.value))}
                  className="w-16 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
                <span className="text-xs text-gray-400">min</span>
              </div>
            </label>
          </div>

          {/* QR de puerta */}
          <div className="mt-3 bg-violet-50 border border-violet-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-violet-700 mb-1">QR de puerta</p>
            <p className="text-[11px] text-gray-500 mb-2">
              Imprimí y pegá en la entrada el QR que apunta a esta dirección (es distinto a los QR de mesa):
            </p>
            <code className="block text-[11px] bg-white border border-violet-100 rounded-lg px-3 py-2 text-violet-700 break-all">
              /esperar/{restaurantSlug}
            </code>
            <p className="text-[11px] text-gray-400 mt-1.5">El QR descargable está en &quot;Mesas y QR&quot;.</p>
          </div>

          {waitlistMsg && <p className={`text-sm mt-3 ${waitlistMsg.includes("✓") ? "text-emerald-600" : "text-red-500"}`}>{waitlistMsg}</p>}
          <button onClick={saveWaitlist} disabled={savingWaitlist}
            className="mt-4 bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 font-semibold text-sm px-4 py-2.5 rounded-xl transition-all">
            {savingWaitlist ? "Guardando..." : "Guardar"}
          </button>
        </section>
      </div>
    </div>
  );
}
