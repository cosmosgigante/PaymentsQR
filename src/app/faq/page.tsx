import Footer from "@/components/Footer";

export const metadata = {
  title: "Preguntas frecuentes — PaymentsQR",
  description: "Respuestas a las preguntas más comunes sobre el sistema de pedidos QR para restaurantes.",
};

const faqs = [
  {
    q: "¿Qué es PaymentsQR?",
    a: "PaymentsQR es un sistema de pedidos por código QR para restaurantes. El comensal escanea el QR de su mesa, ve el menú digital, arma su pedido y elige cómo pagar. El personal gestiona los pedidos en tiempo real desde el panel de cocina y mozos.",
  },
  {
    q: "¿Cómo se crea una cuenta de restaurante?",
    a: "Las cuentas de restaurante se crean por el equipo de PaymentsQR. Escribinos a quintaescala5@gmail.com con el nombre de tu local y te contactamos para darte de alta.",
  },
  {
    q: "¿Puedo tener más de una sucursal?",
    a: "Sí. Los planes permiten agregar sucursales adicionales. Cada sucursal tiene su propio menú, mesas y códigos QR independientes, todo gestionado desde una sola cuenta.",
  },
  {
    q: "¿Cómo funciona el QR de mesa?",
    a: "Cada mesa tiene un código QR único. Al escanearlo, el comensal accede directamente al menú de esa mesa sin descargar ninguna app. Puede agregar items al carrito y enviar el pedido directamente a la cocina.",
  },
  {
    q: "¿El comensal necesita instalar algo?",
    a: "No. El sistema funciona 100% desde el navegador del teléfono. No requiere descargar ninguna aplicación.",
  },
  {
    q: "¿Cómo funciona el pago?",
    a: "El sistema ofrece dos modalidades: pago en caja al terminar (el comensal come y paga al salir, como es habitual en Argentina) y pago online con tarjeta o billetera virtual (próximamente).",
  },
  {
    q: "¿El panel de cocina funciona en tiempo real?",
    a: "Sí. Los pedidos aparecen en el panel de cocina y de mozos en tiempo real, sin necesidad de refrescar la pantalla. El sistema usa Server-Sent Events con un fallback automático para garantizar la sincronización.",
  },
  {
    q: "¿Puedo gestionar el personal con permisos específicos?",
    a: "Sí. Podés crear accesos de personal (cocina, mozos, encargados) con permisos granulares por módulo: quién puede ver pedidos, quién puede modificar el menú, quién puede acceder a las estadísticas, etc.",
  },
  {
    q: "¿Qué pasa con mis datos si cancelo la suscripción?",
    a: "Tus datos se conservan durante 30 días adicionales para que puedas exportarlos. Pasado ese período se eliminan definitivamente. Podés solicitarlo antes escribiendo a quintaescala5@gmail.com.",
  },
  {
    q: "¿Los datos de mis clientes están seguros?",
    a: "Sí. Toda la comunicación viaja cifrada por HTTPS. Los datos personales de los comensales (nombre y email) se anonimatizan automáticamente a los 90 días. El sistema aplica rate limiting, tokens JWT y bcrypt para contraseñas.",
  },
  {
    q: "¿Puedo cambiar de plan?",
    a: "Sí. Escribinos a quintaescala5@gmail.com y gestionamos el cambio de plan. Los cambios se aplican al inicio del próximo período de facturación.",
  },
  {
    q: "¿Cómo cancelo mi suscripción?",
    a: "Escribinos a quintaescala5@gmail.com con al menos 7 días de anticipación al vencimiento del período en curso. No se realizan reembolsos por períodos ya abonados.",
  },
];

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <div className="flex-1 py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <div className="text-3xl mb-3">💬</div>
            <h1 className="text-2xl font-bold text-zinc-900 mb-1">Preguntas frecuentes</h1>
            <p className="text-zinc-500 text-sm">Todo lo que necesitás saber sobre PaymentsQR.</p>
          </div>

          <div className="space-y-3">
            {faqs.map((item, i) => (
              <details
                key={i}
                className="bg-white border border-zinc-200 rounded-2xl overflow-hidden group"
              >
                <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none font-semibold text-zinc-900 text-[15px] select-none">
                  {item.q}
                  <span className="text-zinc-400 text-lg flex-shrink-0 group-open:rotate-45 transition-transform duration-200">+</span>
                </summary>
                <p className="px-5 pb-4 text-zinc-600 text-[14px] leading-relaxed border-t border-zinc-100 pt-3">
                  {item.a}
                </p>
              </details>
            ))}
          </div>

          <div className="mt-10 bg-white border border-zinc-200 rounded-2xl p-5 text-center">
            <p className="text-zinc-700 text-sm font-semibold mb-1">¿No encontraste lo que buscabas?</p>
            <p className="text-zinc-500 text-sm mb-3">Escribinos y te respondemos a la brevedad.</p>
            <a
              href="mailto:quintaescala5@gmail.com"
              className="inline-block bg-zinc-900 hover:bg-zinc-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              Contactar soporte
            </a>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
