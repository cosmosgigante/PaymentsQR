"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";


type Mode = "login" | "register" | "forgot";

export default function LoginPage() {
  const [mode, setMode]             = useState<Mode>("login");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [error, setError]           = useState<string | null>(null);
  const [success, setSuccess]       = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);

  function switchMode(m: Mode) {
    setMode(m); setError(null); setSuccess(null);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Credenciales inválidas"); setLoading(false); return; }
    window.location.href = data.role === "SUPERADMIN" ? "/setup" : "/admin";
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Las contraseñas no coinciden"); return; }
    if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres"); return; }
    setLoading(true); setError(null);

    // Registrar server-side (crea el usuario en Supabase con email confirmado, solo si está pre-aprobado)
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Error al registrar"); setLoading(false); return; }

    // Login inmediato con el sistema JWT
    const loginRes = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) { setError("Cuenta creada. Iniciá sesión."); setLoading(false); return; }
    window.location.href = loginData.role === "SUPERADMIN" ? "/setup" : "/admin";
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setLoading(false);
    if (err) { setError("Error al enviar el email"); return; }
    setSuccess("Revisá tu email para restablecer tu contraseña.");
  }

  function handleGoogleLogin() {
    setLoading(true);
    window.location.href = "/api/auth/google";
  }

  const params   = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const urlError = params?.get("error");

  return (
    <div
      className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden"
      style={{ paddingTop: "max(1rem, env(safe-area-inset-top))", paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      {/* Fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        {/* Gradientes */}
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-orange-500/10 blur-[140px]" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-[140px]" />
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-orange-700/8 blur-[100px]" />

        {/* QR decorativo - arriba izquierda */}
        <svg className="absolute top-10 left-10 opacity-[0.06]" width="90" height="90" viewBox="0 0 90 90" fill="white">
          <rect x="2" y="2" width="36" height="36" rx="4" fill="none" stroke="white" strokeWidth="4"/>
          <rect x="12" y="12" width="16" height="16" rx="2"/>
          <rect x="52" y="2" width="36" height="36" rx="4" fill="none" stroke="white" strokeWidth="4"/>
          <rect x="62" y="12" width="16" height="16" rx="2"/>
          <rect x="2" y="52" width="36" height="36" rx="4" fill="none" stroke="white" strokeWidth="4"/>
          <rect x="12" y="62" width="16" height="16" rx="2"/>
          <rect x="52" y="52" width="8" height="8" rx="1"/><rect x="64" y="52" width="8" height="8" rx="1"/>
          <rect x="76" y="52" width="8" height="8" rx="1"/><rect x="52" y="64" width="8" height="8" rx="1"/>
          <rect x="64" y="64" width="8" height="8" rx="1"/><rect x="76" y="76" width="8" height="8" rx="1"/>
          <rect x="52" y="76" width="8" height="8" rx="1"/>
        </svg>

        {/* Tenedor y cuchillo - arriba derecha */}
        <svg className="absolute top-16 right-16 opacity-[0.06]" width="60" height="100" viewBox="0 0 60 100" fill="white">
          <path d="M10 5 L10 35 Q10 42 16 45 L16 95 Q16 98 19 98 Q22 98 22 95 L22 45 Q28 42 28 35 L28 5" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"/>
          <line x1="14" y1="5" x2="14" y2="30" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="19" y1="5" x2="19" y2="30" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="24" y1="5" x2="24" y2="30" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M45 5 Q55 5 55 20 Q55 32 48 36 L48 95 Q48 98 45 98 Q42 98 42 95 L42 5" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"/>
        </svg>

        {/* Plato - abajo izquierda */}
        <svg className="absolute bottom-20 left-20 opacity-[0.06]" width="100" height="100" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="44" stroke="white" strokeWidth="4"/>
          <circle cx="50" cy="50" r="32" stroke="white" strokeWidth="2.5"/>
          <circle cx="50" cy="50" r="18" stroke="white" strokeWidth="2"/>
          <path d="M30 20 Q50 10 70 20" stroke="white" strokeWidth="3" strokeLinecap="round"/>
        </svg>

        {/* QR pequeño - abajo derecha */}
        <svg className="absolute bottom-24 right-12 opacity-[0.05]" width="60" height="60" viewBox="0 0 90 90" fill="white">
          <rect x="2" y="2" width="36" height="36" rx="4" fill="none" stroke="white" strokeWidth="4"/>
          <rect x="12" y="12" width="16" height="16" rx="2"/>
          <rect x="52" y="2" width="36" height="36" rx="4" fill="none" stroke="white" strokeWidth="4"/>
          <rect x="62" y="12" width="16" height="16" rx="2"/>
          <rect x="2" y="52" width="36" height="36" rx="4" fill="none" stroke="white" strokeWidth="4"/>
          <rect x="12" y="62" width="16" height="16" rx="2"/>
          <rect x="52" y="52" width="8" height="8" rx="1"/><rect x="64" y="52" width="8" height="8" rx="1"/>
          <rect x="76" y="64" width="8" height="8" rx="1"/><rect x="52" y="76" width="8" height="8" rx="1"/>
          <rect x="64" y="76" width="8" height="8" rx="1"/>
        </svg>

        {/* Copa de vino - centro izquierda */}
        <svg className="absolute top-1/2 left-8 -translate-y-1/2 opacity-[0.05]" width="50" height="90" viewBox="0 0 50 90" fill="white">
          <path d="M5 5 L45 5 Q45 40 25 45 Q5 40 5 5Z" stroke="white" strokeWidth="3" fill="none"/>
          <line x1="25" y1="45" x2="25" y2="75" stroke="white" strokeWidth="3" strokeLinecap="round"/>
          <line x1="10" y1="75" x2="40" y2="75" stroke="white" strokeWidth="3" strokeLinecap="round"/>
        </svg>
      </div>

      {/* Card de login */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-10 bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 sm:p-8 w-full max-w-sm shadow-2xl"
        style={{ backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
      >
        {/* Header */}
        <div className="mb-7 text-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: "spring", bounce: 0.4 }}
            className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl shadow-lg select-none"
          >
            🍽️
          </motion.div>
          <h1 className="text-2xl font-bold text-white tracking-tight">PaymentsQR</h1>
          <p className="text-zinc-500 text-sm mt-1">Sistema de pedidos para restaurantes</p>
        </div>

        {/* Error */}
        {(error || urlError) && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-400 text-xs text-center bg-red-950/40 border border-red-900/40 rounded-xl py-2.5 px-3 mb-4"
          >
            {error || (urlError === "unauthorized" ? "Tu cuenta no tiene acceso." : "Error al iniciar sesión.")}
          </motion.p>
        )}

        {/* Google */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-100 active:bg-zinc-200 disabled:opacity-50 text-zinc-900 font-semibold py-3.5 rounded-xl transition-all text-[15px] mb-4 min-h-[52px] shadow-sm"
        >
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuar con Google
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-zinc-600 text-[11px] uppercase tracking-widest">o</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        {/* Toggle login / registro */}
        {mode !== "forgot" && (
          <div className="flex bg-zinc-800 rounded-xl p-1 mb-4">
            <button type="button" onClick={() => switchMode("login")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === "login" ? "bg-white text-zinc-900 shadow" : "text-zinc-400 hover:text-white"}`}>
              Iniciar sesión
            </button>
            <button type="button" onClick={() => switchMode("register")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === "register" ? "bg-white text-zinc-900 shadow" : "text-zinc-400 hover:text-white"}`}>
              Registrarse
            </button>
          </div>
        )}

        {/* Mensaje éxito */}
        {success && (
          <p className="text-emerald-400 text-xs text-center bg-emerald-950/40 border border-emerald-900/40 rounded-xl py-2.5 px-3 mb-3">{success}</p>
        )}

        {/* Formulario login */}
        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-3">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" inputMode="email" placeholder="Email"
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3.5 text-[16px] focus:outline-none focus:ring-2 focus:ring-white/20 placeholder:text-zinc-600 min-h-[52px]" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" placeholder="Contraseña"
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3.5 text-[16px] focus:outline-none focus:ring-2 focus:ring-white/20 placeholder:text-zinc-600 min-h-[52px]" />
            <button type="submit" disabled={loading}
              className="w-full bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all text-[15px] min-h-[56px]">
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
            <button type="button" onClick={() => switchMode("forgot")}
              className="w-full text-zinc-500 hover:text-zinc-300 text-xs text-center transition-colors pt-1">
              Olvidé mi contraseña
            </button>
          </form>
        )}

        {/* Formulario registro */}
        {mode === "register" && (
          <form onSubmit={handleRegister} className="space-y-3">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" inputMode="email" placeholder="Email"
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3.5 text-[16px] focus:outline-none focus:ring-2 focus:ring-white/20 placeholder:text-zinc-600 min-h-[52px]" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" placeholder="Contraseña"
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3.5 text-[16px] focus:outline-none focus:ring-2 focus:ring-white/20 placeholder:text-zinc-600 min-h-[52px]" />
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required autoComplete="new-password" placeholder="Repetir contraseña"
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3.5 text-[16px] focus:outline-none focus:ring-2 focus:ring-white/20 placeholder:text-zinc-600 min-h-[52px]" />
            <button type="submit" disabled={loading}
              className="w-full bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all text-[15px] min-h-[56px]">
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>
        )}

        {/* Formulario olvidé contraseña */}
        {mode === "forgot" && (
          <form onSubmit={handleForgot} className="space-y-3">
            <p className="text-zinc-400 text-sm text-center mb-1">Ingresá tu email y te enviamos un link para restablecer tu contraseña.</p>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" inputMode="email" placeholder="Email"
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3.5 text-[16px] focus:outline-none focus:ring-2 focus:ring-white/20 placeholder:text-zinc-600 min-h-[52px]" />
            <button type="submit" disabled={loading}
              className="w-full bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all text-[15px] min-h-[56px]">
              {loading ? "Enviando..." : "Enviar link"}
            </button>
            <button type="button" onClick={() => switchMode("login")}
              className="w-full text-zinc-500 hover:text-zinc-300 text-xs text-center transition-colors pt-1">
              Volver al inicio de sesión
            </button>
          </form>
        )}

        <p className="text-zinc-700 text-[11px] text-center mt-5">
          Solo usuarios autorizados pueden acceder
        </p>
      </motion.div>
    </div>
  );
}
