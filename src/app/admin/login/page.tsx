"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Error al iniciar sesión"); return; }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div
      className="min-h-screen-dvh bg-zinc-950 flex items-center justify-center p-4"
      style={{ paddingTop: "max(1rem, env(safe-area-inset-top))", paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 w-full max-w-sm"
      >
        <div className="mb-7">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-5 text-xl select-none">
            🍽️
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Bienvenido</h1>
          <p className="text-zinc-500 text-sm mt-1">Ingresá para gestionar tu restaurante</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest block mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              inputMode="email"
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3.5 text-[16px] focus:outline-none focus:ring-2 focus:ring-white/20 placeholder:text-zinc-600 min-h-[52px]"
              placeholder="admin@restaurante.com"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest block mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3.5 text-[16px] focus:outline-none focus:ring-2 focus:ring-white/20 placeholder:text-zinc-600 min-h-[52px]"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs text-center bg-red-950/40 border border-red-900/40 rounded-xl py-2.5 px-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white active:bg-zinc-100 disabled:opacity-50 text-zinc-900 font-bold py-4 rounded-xl transition-all text-[15px] mt-1 min-h-[56px]"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
