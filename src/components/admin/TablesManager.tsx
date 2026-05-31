"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, QrCode, Power, Trash2, ArrowLeft, Download, X } from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";

type Table = {
  id: string;
  number: number;
  label: string | null;
  qrToken: string;
  isActive: boolean;
};

export default function TablesManager({
  initialTables,
}: {
  initialTables: Table[];
  restaurantSlug: string;
}) {
  const [tables, setTables] = useState<Table[]>(initialTables);
  const [newNumber, setNewNumber] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedQr, setSelectedQr] = useState<Table | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    if (!selectedQr) { setQrDataUrl(""); return; }
    const url = `${window.location.origin}/mesa/${selectedQr.qrToken}`;
    QRCode.toDataURL(url, {
      width: 280,
      margin: 2,
      color: { dark: "#09090b", light: "#ffffff" },
    }).then(setQrDataUrl);
  }, [selectedQr]);

  async function createTable() {
    if (!newNumber) return;
    setSaving(true);
    const res = await fetch("/api/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number: parseInt(newNumber), label: newLabel || undefined }),
    });
    const data = await res.json();
    if (res.ok) {
      setTables((prev) => [...prev, data].sort((a, b) => a.number - b.number));
      setNewNumber("");
      setNewLabel("");
    } else {
      alert(data.error);
    }
    setSaving(false);
  }

  async function toggleActive(table: Table) {
    const res = await fetch(`/api/tables/${table.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !table.isActive }),
    });
    const updated = await res.json();
    if (res.ok) setTables((prev) => prev.map((t) => t.id === updated.id ? updated : t));
  }

  async function deleteTable(table: Table) {
    if (!confirm(`¿Eliminar ${table.label ?? `Mesa ${table.number}`}?`)) return;
    const res = await fetch(`/api/tables/${table.id}`, { method: "DELETE" });
    if (res.ok) setTables((prev) => prev.filter((t) => t.id !== table.id));
  }

  function downloadQr() {
    if (!qrDataUrl || !selectedQr) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qr-mesa-${selectedQr.number}.png`;
    a.click();
  }

  return (
    <div className="min-h-screen-dvh bg-[#fafafa]">
      {/* Header */}
      <div
        className="bg-white border-b border-zinc-100 px-4 sm:px-5"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
      >
        <div className="max-w-2xl mx-auto flex items-center gap-3 pb-4">
          <Link
            href="/admin"
            className="w-9 h-9 flex items-center justify-center text-zinc-400 active:text-zinc-700 transition-colors"
          >
            <ArrowLeft size={18} strokeWidth={2} />
          </Link>
          <h1 className="font-bold text-zinc-900 text-lg">Mesas y QR</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-5 py-5 space-y-3">
        {/* Crear mesa */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-4">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">
            Nueva mesa
          </p>
          <div className="flex gap-2">
            <input
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
              placeholder="N°"
              type="number"
              min="1"
              inputMode="numeric"
              className="w-16 bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 placeholder:text-zinc-300 text-center min-h-[48px]"
            />
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Nombre (ej: Terraza 1)"
              className="flex-1 bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 placeholder:text-zinc-300 min-h-[48px]"
            />
            <button
              onClick={createTable}
              disabled={saving || !newNumber}
              className="bg-zinc-900 active:bg-zinc-700 disabled:opacity-40 text-white px-4 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 flex-shrink-0 min-h-[48px]"
            >
              <Plus size={15} strokeWidth={2.5} />
              Crear
            </button>
          </div>
        </div>

        {/* Lista */}
        <div className="space-y-2">
          {tables.map((table, i) => (
            <motion.div
              key={table.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`bg-white rounded-2xl border border-zinc-100 p-4 flex items-center gap-3 min-h-[72px] ${!table.isActive ? "opacity-60" : ""}`}
            >
              <div className="flex-1 min-w-0">
                <p className="font-bold text-zinc-900 text-[15px] leading-snug">
                  {table.label ?? `Mesa ${table.number}`}
                </p>
                {table.label && (
                  <p className="text-xs text-zinc-400 mt-0.5">N° {table.number}</p>
                )}
                <p className={`text-xs mt-0.5 font-medium ${table.isActive ? "text-emerald-600" : "text-zinc-400"}`}>
                  {table.isActive ? "Activa" : "Inactiva"}
                </p>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setSelectedQr(table)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-400 active:bg-zinc-100 active:text-zinc-900 transition-colors"
                >
                  <QrCode size={17} strokeWidth={2} />
                </button>
                <button
                  onClick={() => toggleActive(table)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    table.isActive
                      ? "text-emerald-600 active:bg-emerald-50"
                      : "text-zinc-300 active:bg-zinc-100"
                  }`}
                >
                  <Power size={15} strokeWidth={2} />
                </button>
                <button
                  onClick={() => deleteTable(table)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-300 active:text-red-500 active:bg-red-50 transition-colors"
                >
                  <Trash2 size={15} strokeWidth={2} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {tables.length === 0 && (
          <div className="text-center py-16 text-zinc-400">
            <QrCode size={36} className="mx-auto mb-3" strokeWidth={1} />
            <p className="text-sm">Creá tu primera mesa para generar el QR</p>
          </div>
        )}
      </div>

      {/* Modal QR — full screen en mobile */}
      {selectedQr && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" style={{ WebkitBackdropFilter: "blur(2px)", backdropFilter: "blur(2px)" }} onClick={() => setSelectedQr(null)} />
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="relative bg-white rounded-t-[28px] sm:rounded-3xl w-full sm:max-w-xs shadow-2xl"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
          >
            {/* Handle móvil */}
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="w-8 h-1 bg-zinc-200 rounded-full" />
            </div>

            <div className="p-5 sm:p-6 text-center">
              <div className="flex items-center justify-between mb-1">
                <div />
                <h3 className="font-bold text-zinc-900 text-lg">
                  {selectedQr.label ?? `Mesa ${selectedQr.number}`}
                </h3>
                <button
                  onClick={() => setSelectedQr(null)}
                  className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 active:bg-zinc-200"
                >
                  <X size={15} />
                </button>
              </div>
              <p className="text-xs text-zinc-400 mb-5">Escaneá para ver el menú</p>

              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR"
                  className="mx-auto rounded-2xl border border-zinc-100"
                  style={{ width: 200, height: 200 }}
                />
              ) : (
                <div className="w-[200px] h-[200px] mx-auto bg-zinc-100 rounded-2xl animate-pulse" />
              )}

              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setSelectedQr(null)}
                  className="flex-1 border border-zinc-200 text-zinc-600 py-3.5 rounded-2xl text-sm font-medium active:bg-zinc-50 transition-colors min-h-[52px]"
                >
                  Cerrar
                </button>
                <button
                  onClick={downloadQr}
                  className="flex-1 bg-zinc-900 active:bg-zinc-700 text-white py-3.5 rounded-2xl text-sm font-medium transition-colors flex items-center justify-center gap-2 min-h-[52px]"
                >
                  <Download size={14} />
                  Descargar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
