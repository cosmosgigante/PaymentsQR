"use client";

export default function PlaceholderPanel({ name, description }: { name: string; description: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center shadow-sm">
      <p className="text-3xl mb-3">🚧</p>
      <p className="font-semibold text-gray-800">{name}</p>
      <p className="text-gray-400 text-sm mt-1">{description}</p>
      <span className="inline-block mt-3 text-[11px] font-semibold bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">Próximamente</span>
    </div>
  );
}
