"use client";

import React from "react";

// Aísla cada sección del panel: si una rompe, muestra un cartel y el resto del
// superadmin sigue funcionando (no se cae todo el sistema).
export default class PanelBoundary extends React.Component<
  { name: string; children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className="bg-white border border-red-200 rounded-2xl p-8 text-center shadow-sm">
          <p className="text-3xl mb-3">⚠️</p>
          <p className="text-gray-800 font-semibold">La sección &quot;{this.props.name}&quot; falló</p>
          <p className="text-gray-400 text-sm mt-1">El resto del panel sigue funcionando.</p>
          <p className="text-red-400 text-xs font-mono mt-3 break-all">{this.state.error.message}</p>
          <button onClick={this.reset} className="mt-4 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-700">
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
