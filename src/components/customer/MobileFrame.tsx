/**
 * En desktop: centra el contenido en un frame tipo celular (max 430px).
 * En mobile: transparente, ocupa toda la pantalla.
 */
export default function MobileFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen-dvh bg-zinc-200 sm:flex sm:items-start sm:justify-center sm:py-0">
      {/* Frame visible solo en desktop */}
      <div className="w-full sm:max-w-[430px] sm:min-h-screen-dvh sm:shadow-2xl sm:shadow-black/20 bg-[#fafafa] relative">
        {children}
      </div>
    </div>
  );
}
