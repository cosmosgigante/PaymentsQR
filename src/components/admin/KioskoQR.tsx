"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import QRCode from "qrcode";
import { ArrowLeft, Plus, QrCode, Trash2, Download, X, Users, KeyRound } from "lucide-react";

type QR = { id: string; kind: string; label: string; token: string };

export default function KioskoQR({ slug }: { slug: string }) {
  const [qrs, setQrs] = useState<QR[]>([]);
  const [tab, setTab] = useState<"CLIENT" | "STAFF">("CLIENT");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<QR | null>(null);
  const [dataUrl, setDataUrl] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/access-qr", { cache: "no-store" });
    if (r.ok) setQrs((await r.json()).qrs ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  // URL que codifica cada QR según su tipo.
  const urlFor = useCallback((qr: QR) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return qr.kind === "STAFF" ? `${origin}/` : `${origin}/tienda/${slug}?p=${qr.token}`;
  }, [slug]);

  useEffect(() => {
    if (!selected) { setDataUrl(""); return; }
    QRCode.toDataURL(urlFor(selected), {
      width: 320, margin: 2,
      color: { dark: selected.kind === "STAFF" ? "#1e3a8a" : "#5b21b6", light: "#ffffff" },
    }).then(setDataUrl);
  }, [selected, urlFor]);

  async function create() {
    if (!label.trim()) return;
    setSaving(true);
    const r = await fetch("/api/access-qr", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: tab, label: label.trim() }),
    });
    if (r.ok) { setLabel(""); load(); }
    setSaving(false);
  }

  async function remove(qr: QR) {
    if (!confirm(`¿Eliminar "${qr.label}"?`)) return;
    const r = await fetch(`/api/access-qr?id=${qr.id}`, { method: "DELETE" });
    if (r.ok) { setQrs((prev) => prev.filter((q) => q.id !== qr.id)); if (selected?.id === qr.id) setSelected(null); }
  }

  function download() {
    if (!dataUrl || !selected) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qr-${selected.kind.toLowerCase()}-${selected.label.replace(/\s+/g, "-")}.png`;
    a.click();
  }

  const list = qrs.filter((q) => q.kind === tab);

  return (
    <div className="min-h-screen-dvh bg-slate-100">
      <div className="relative overflow-hidden px-4 sm:px-5 pb-6"
        style={{ background: "linear-gradient(135deg, #1e2d4e 0%, #1a3a6b 60%, #1e3a8a 100%)", paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}>
        <div className="relative max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/admin" className="w-9 h-9 flex items-center justify-center text-white/60 hover:text-white"><ArrowLeft size={18} /></Link>
          <h1 className="font-bold text-white text-lg">QR del negocio</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-5 py-5 space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-2xl border border-zinc-100 shadow-sm p-1">
          <button onClick={() => setTab("CLIENT")}
            className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold py-2.5 rounded-xl transition-all ${tab === "CLIENT" ? "bg-violet-600 text-white" : "text-zinc-500"}`}>
            <Users size={15} /> Clientes
          </button>
          <button onClick={() => setTab("STAFF")}
            className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold py-2.5 rounded-xl transition-all ${tab === "STAFF" ? "bg-blue-800 text-white" : "text-zinc-500"}`}>
            <KeyRound size={15} /> Login interno
          </button>
        </div>

        <p className="text-xs text-zinc-400 px-1">
          {tab === "CLIENT"
            ? "QR para que los clientes vean el catálogo y pidan. Podés tener varios (mostrador, vidriera, delivery…)."
            : "QR para que el personal entre a iniciar sesión. Pedís credenciales igual — es solo un atajo al login."}
        </p>

        {/* Crear */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-4">
          <div className="flex gap-2">
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={tab === "CLIENT" ? "Ej: Mostrador" : "Ej: Caja"}
              className="flex-1 bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-zinc-900 min-h-[48px]" />
            <button onClick={create} disabled={saving || !label.trim()}
              className="bg-zinc-900 active:bg-zinc-700 disabled:opacity-40 text-white px-4 rounded-xl text-sm font-medium flex items-center gap-1.5 min-h-[48px]">
              <Plus size={15} /> Crear
            </button>
          </div>
        </div>

        {/* Lista */}
        <div className="space-y-2">
          {list.map((qr, i) => (
            <motion.div key={qr.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="bg-white rounded-2xl border border-zinc-100 p-4 flex items-center gap-3 min-h-[64px]">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-zinc-900 text-[15px] truncate">{qr.label}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">{qr.kind === "CLIENT" ? "Cliente · tienda" : "Login interno"}</p>
              </div>
              <button onClick={() => setSelected(qr)} className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-400 active:bg-zinc-100 active:text-zinc-900"><QrCode size={17} /></button>
              <button onClick={() => remove(qr)} className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-300 active:text-red-500 active:bg-red-50"><Trash2 size={15} /></button>
            </motion.div>
          ))}
          {list.length === 0 && (
            <div className="text-center py-12 text-zinc-400">
              <QrCode size={34} className="mx-auto mb-3" strokeWidth={1} />
              <p className="text-sm">Creá tu primer QR de {tab === "CLIENT" ? "clientes" : "login interno"}.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal QR */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <motion.div initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="relative bg-white rounded-t-[28px] sm:rounded-3xl w-full sm:max-w-xs shadow-2xl"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
            <div className="flex justify-center pt-3 sm:hidden"><div className="w-8 h-1 bg-zinc-200 rounded-full" /></div>
            <div className="p-5 sm:p-6 text-center">
              <div className="flex items-center justify-between mb-1">
                <div />
                <h3 className="font-bold text-zinc-900 text-lg truncate px-2">{selected.label}</h3>
                <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500"><X size={15} /></button>
              </div>
              <p className="text-xs text-zinc-400 mb-5">{selected.kind === "STAFF" ? "Para iniciar sesión el personal" : "Escaneá para ver el catálogo y pedir"}</p>
              {dataUrl ? (
                <img src={dataUrl} alt="QR" className="mx-auto rounded-2xl border border-zinc-100" style={{ width: 200, height: 200 }} />
              ) : (
                <div className="w-[200px] h-[200px] mx-auto bg-zinc-100 rounded-2xl animate-pulse" />
              )}
              <div className="flex gap-2 mt-5">
                <button onClick={() => setSelected(null)} className="flex-1 border border-zinc-200 text-zinc-600 py-3.5 rounded-2xl text-sm font-medium min-h-[52px]">Cerrar</button>
                <button onClick={download} className="flex-1 bg-zinc-900 active:bg-zinc-700 text-white py-3.5 rounded-2xl text-sm font-medium flex items-center justify-center gap-2 min-h-[52px]"><Download size={14} /> Descargar</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
