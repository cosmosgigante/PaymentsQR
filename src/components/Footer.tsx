const year = new Date().getFullYear();

export default function Footer({ dark = false }: { dark?: boolean }) {
  const text  = dark ? "text-white/40 hover:text-white/70" : "text-zinc-400 hover:text-zinc-600";
  const muted = dark ? "text-white/25" : "text-zinc-400";
  const dot   = dark ? "text-white/20" : "text-zinc-300";

  return (
    <footer className="w-full py-5 px-4">
      <div className="flex flex-col items-center gap-2">
        {/* Links legales */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <a href="/terminos"  className={`text-xs transition-colors underline underline-offset-2 ${text}`}>Términos de servicio</a>
          <span className={`text-xs ${dot}`}>·</span>
          <a href="/privacidad" className={`text-xs transition-colors underline underline-offset-2 ${text}`}>Privacidad</a>
          <span className={`text-xs ${dot}`}>·</span>
          <a href="/mis-datos"  className={`text-xs transition-colors underline underline-offset-2 ${text}`}>Mis datos</a>
          <span className={`text-xs ${dot}`}>·</span>
          <a href="/faq"       className={`text-xs transition-colors underline underline-offset-2 ${text}`}>FAQ</a>
          <span className={`text-xs ${dot}`}>·</span>
          <a href="mailto:quintaescala5@gmail.com" className={`text-xs transition-colors underline underline-offset-2 ${text}`}>Contacto</a>
        </div>

        {/* Copyright */}
        <p className={`text-[11px] ${muted}`}>
          © {year} PaymentsQR. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
