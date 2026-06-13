export const metadata = {
  title: "Términos de Servicio — PaymentsQR",
  description: "Condiciones de uso de la plataforma PaymentsQR para restaurantes.",
};

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-zinc-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="text-3xl mb-3">📋</div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-1">Términos de Servicio</h1>
          <p className="text-zinc-500 text-sm">Última actualización: junio 2026</p>
        </div>

        <div className="space-y-6 text-zinc-700 text-[15px] leading-relaxed">

          <section>
            <h2 className="text-base font-bold text-zinc-900 mb-2">1. Descripción del servicio</h2>
            <p>
              PaymentsQR es una plataforma SaaS de gestión de pedidos por código QR para restaurantes.
              Permite a los comensales ver el menú y realizar pedidos desde su mesa mediante su dispositivo móvil,
              y al personal del restaurante gestionar esos pedidos en tiempo real.
            </p>
            <p className="mt-2">
              El servicio es contratado por el restaurante (el <strong>"Cliente"</strong>). Los comensales
              que usan el sistema QR son usuarios finales del Cliente, no de PaymentsQR directamente.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-zinc-900 mb-2">2. Aceptación de los términos</h2>
            <p>
              Al registrarse o usar la plataforma, el Cliente acepta estos Términos de Servicio en su
              totalidad. Si no estás de acuerdo con alguna de las condiciones, no utilices el servicio.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-zinc-900 mb-2">3. Cuentas y acceso</h2>
            <ul className="mt-2 space-y-1 list-disc list-inside text-zinc-600">
              <li>Cada cuenta es personal e intransferible.</li>
              <li>El Cliente es responsable de mantener la confidencialidad de sus credenciales.</li>
              <li>
                El Cliente es responsable de todas las acciones que ocurran bajo su cuenta,
                incluidas las acciones de su personal.
              </li>
              <li>
                PaymentsQR se reserva el derecho de suspender cuentas que incumplan estos términos,
                con o sin aviso previo, según la gravedad del incumplimiento.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-zinc-900 mb-2">4. Uso aceptable</h2>
            <p>Queda prohibido usar la plataforma para:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside text-zinc-600">
              <li>Actividades ilegales o fraudulentas.</li>
              <li>Enviar contenido ofensivo, difamatorio o que infrinja derechos de terceros.</li>
              <li>Intentar acceder sin autorización a sistemas, servidores o datos ajenos.</li>
              <li>Realizar pruebas de carga o ataques automatizados contra la plataforma.</li>
              <li>Revender o sublicenciar el acceso a terceros sin autorización escrita.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-zinc-900 mb-2">5. Planes y pagos</h2>
            <p>
              El servicio se ofrece bajo planes de suscripción (mensual, trimestral, anual).
              El precio, la duración y las condiciones del plan contratado son los informados
              al momento del alta.
            </p>
            <ul className="mt-2 space-y-1 list-disc list-inside text-zinc-600">
              <li>El acceso al servicio requiere una suscripción activa y vigente.</li>
              <li>
                La falta de pago puede resultar en la suspensión del acceso hasta regularizar
                la situación.
              </li>
              <li>
                Los precios pueden actualizarse con un aviso mínimo de 30 días antes de
                la renovación.
              </li>
              <li>No se realizan reembolsos por períodos ya abonados y no utilizados, salvo acuerdo expreso.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-zinc-900 mb-2">6. Disponibilidad del servicio</h2>
            <p>
              PaymentsQR procura mantener el servicio disponible de forma continua, pero no garantiza
              una disponibilidad del 100%. Pueden ocurrir interrupciones por mantenimiento, actualizaciones
              o causas ajenas a nuestro control (fallas de infraestructura de terceros, cortes de internet, etc.).
            </p>
            <p className="mt-2">
              PaymentsQR no se responsabiliza por pérdidas económicas derivadas de interrupciones
              del servicio fuera de su control.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-zinc-900 mb-2">7. Datos y privacidad</h2>
            <p>
              El tratamiento de datos personales se rige por nuestra{" "}
              <a href="/privacidad" className="text-blue-600 underline hover:text-blue-800">
                Política de Privacidad
              </a>
              , que forma parte integral de estos Términos.
            </p>
            <p className="mt-2">
              Los datos de los comensales (nombre, email, detalle del pedido) son tratados por el
              restaurante como responsable del tratamiento. PaymentsQR actúa como encargado
              de tratamiento en nombre del restaurante.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-zinc-900 mb-2">8. Propiedad intelectual</h2>
            <p>
              El software, diseño, código y contenido de PaymentsQR son propiedad exclusiva de sus
              desarrolladores. El Cliente recibe una licencia de uso limitada, no exclusiva e
              intransferible para usar la plataforma durante la vigencia de su suscripción.
            </p>
            <p className="mt-2">
              El Cliente conserva la propiedad de sus datos (menú, pedidos, configuración) y puede
              solicitar su exportación en cualquier momento.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-zinc-900 mb-2">9. Limitación de responsabilidad</h2>
            <p>
              En ningún caso PaymentsQR será responsable por daños indirectos, incidentales, especiales
              o consecuentes derivados del uso o la imposibilidad de uso del servicio, incluyendo
              pérdida de ganancias o pérdida de datos.
            </p>
            <p className="mt-2">
              La responsabilidad máxima de PaymentsQR frente al Cliente en cualquier circunstancia
              no superará el importe abonado por el Cliente en los últimos 3 meses.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-zinc-900 mb-2">10. Modificaciones</h2>
            <p>
              PaymentsQR puede modificar estos Términos con un aviso mínimo de 15 días mediante
              notificación por email o aviso en la plataforma. El uso continuado del servicio
              tras ese período implica la aceptación de los nuevos términos.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-zinc-900 mb-2">11. Terminación</h2>
            <p>
              El Cliente puede cancelar su suscripción en cualquier momento. PaymentsQR puede
              dar de baja una cuenta con aviso previo de 7 días salvo incumplimiento grave,
              en cuyo caso la baja puede ser inmediata.
            </p>
            <p className="mt-2">
              Tras la cancelación, los datos del Cliente se conservan por 30 días adicionales
              para permitir la exportación, luego se eliminan definitivamente.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-zinc-900 mb-2">12. Ley aplicable y jurisdicción</h2>
            <p>
              Estos Términos se rigen por las leyes de la República Argentina. Ante cualquier
              controversia, las partes se someten a la jurisdicción de los tribunales ordinarios
              de la Ciudad Autónoma de Buenos Aires, renunciando a cualquier otro fuero que
              pudiera corresponder.
            </p>
          </section>

          <div className="border-t border-zinc-200 pt-5 mt-8">
            <p className="text-zinc-400 text-xs text-center">
              ¿Tenés preguntas sobre estos términos?{" "}
              <a href="mailto:contacto@paymentsqr.com" className="underline hover:text-zinc-600">
                Contactanos
              </a>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
