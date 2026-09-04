"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { subscribeToast, type ToastMsg } from "@/lib/toast";

// Mostrador de toasts. Se monta una vez en el layout raíz y escucha los mensajes
// globales. Reemplaza los alert() nativos por avisos in-app no bloqueantes.
export default function Toaster() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  useEffect(() => {
    return subscribeToast((t) => {
      setToasts((prev) => [...prev.slice(-2), t]); // como mucho 3 a la vez
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 3500);
    });
  }, []);

  return (
    <div
      className="fixed inset-x-0 z-[100] flex flex-col items-center gap-2 pointer-events-none px-4"
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className={`pointer-events-auto max-w-sm w-full text-center text-sm font-semibold px-4 py-3 rounded-2xl shadow-lg ${
              t.type === "error" ? "bg-red-600 text-white"
              : t.type === "success" ? "bg-emerald-600 text-white"
              : "bg-zinc-900 text-white"
            }`}
          >
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
