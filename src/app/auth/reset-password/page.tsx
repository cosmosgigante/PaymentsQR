"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [ready, setReady]       = useState(false);

  useEffect(() => {
    // Supabase pone el token en el hash de la URL — hay que procesarlo
    const supabase = createClient();
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
  }, []);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Las contraseñas no coinciden"); return; }
    if (password.length < 6) { setError("Mínimo 6 caracteres"); return; }
    setLoading(true); setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) { setError("Error al actualizar la contraseña"); setLoading(false); return; }
    router.push("/api/auth/session");
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-xl select-none">🔑</div>
          <h1 className="text-xl font-bold text-white">Nueva contraseña</h1>
          <p className="text-zinc-500 text-sm mt-1">Elegí tu nueva contraseña</p>
        </div>

        {!ready ? (
          <p className="text-zinc-400 text-sm text-center">Verificando enlace...</p>
        ) : (
          <form onSubmit={handleReset} className="space-y-3">
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Nueva contraseña"
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3.5 text-[16px] focus:outline-none focus:ring-2 focus:ring-white/20 placeholder:text-zinc-600 min-h-[52px]" />
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="Repetir contraseña"
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3.5 text-[16px] focus:outline-none focus:ring-2 focus:ring-white/20 placeholder:text-zinc-600 min-h-[52px]" />
            {error && <p className="text-red-400 text-xs bg-red-950/40 border border-red-900/40 rounded-xl py-2.5 px-3">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-white text-zinc-900 font-bold py-4 rounded-xl transition-all text-[15px] min-h-[56px] disabled:opacity-50">
              {loading ? "Guardando..." : "Guardar contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
