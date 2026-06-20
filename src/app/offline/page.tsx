"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] px-6">
      <div className="text-center max-w-xs">
        <div className="text-5xl mb-4">📡</div>
        <h1 className="text-xl font-bold text-zinc-900 mb-2">Sin conexión</h1>
        <p className="text-zinc-500 text-sm leading-relaxed">
          Parece que no hay internet. Cuando vuelva la conexión, recargá la página.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 bg-zinc-900 text-white px-6 py-3 rounded-2xl text-sm font-semibold active:bg-zinc-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
