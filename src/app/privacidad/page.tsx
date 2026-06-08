export const metadata = {
  title: "Política de Privacidad — PaymentsQR",
  description: "Cómo usamos y protegemos tu información personal al hacer pedidos.",
};

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-zinc-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="text-3xl mb-3">🍽️</div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-1">Política de Privacidad</h1>
          <p className="text-zinc-500 text-sm">Última actualización: junio 2026</p>
        </div>

        <div className="space-y-6 text-zinc-700 text-[15px] leading-relaxed">

          <section>
            <h2 className="text-base font-bold text-zinc-900 mb-2">¿Qué información recopilamos?</h2>
            <p>
              Cuando realizás un pedido a través de nuestro sistema, recopilamos únicamente la información
              necesaria para procesar tu pedido:
            </p>
            <ul className="mt-2 space-y-1 list-disc list-inside text-zinc-600">
              <li><strong>Nombre y apellido</strong> — para identificar tu pedido en el local.</li>
              <li><strong>Número de teléfono</strong> — para contactarte en caso de algún inconveniente con tu pedido.</li>
              <li><strong>Detalle del pedido</strong> — los productos que elegiste, cantidades y aclaraciones.</li>
              <li><strong>Modo de pago elegido</strong> — si vas a pagar en caja o de otra forma.</li>
            </ul>
            <p className="mt-2 text-zinc-500 text-sm">
              No recopilamos datos de tarjetas de crédito, documentos de identidad, ni información sensible de ningún tipo.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-zinc-900 mb-2">¿Para qué usamos tu información?</h2>
            <p>Usamos tus datos exclusivamente para:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside text-zinc-600">
              <li>Identificar tu pedido y vincularlo a tu mesa.</li>
              <li>Prevenir pedidos falsos o de broma que perjudican al restaurante.</li>
              <li>Contactarte en caso de algún problema con tu pedido.</li>
              <li>Cumplir con las obligaciones operativas del restaurante.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-zinc-900 mb-2">¿Compartimos tu información con terceros?</h2>
            <p>
              <strong>No.</strong> Tu información personal no es vendida, alquilada ni compartida con empresas
              de marketing ni terceros ajenos al restaurante. Solo el personal del local (cocina, caja, mozos)
              tiene acceso a tus datos para poder atenderte.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-zinc-900 mb-2">¿Cuánto tiempo guardamos tus datos?</h2>
            <p>
              Tu información se conserva junto con el registro del pedido por un período máximo de
              <strong> 90 días</strong>, necesario para gestión operativa y resolución de reclamos.
              Pasado ese período, los datos personales asociados al pedido son eliminados automáticamente.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-zinc-900 mb-2">¿Cómo protegemos tu información?</h2>
            <p>
              Toda la información viaja cifrada mediante HTTPS. El acceso al sistema está protegido por
              contraseña y solo el personal autorizado del restaurante puede ver los pedidos. No almacenamos
              contraseñas ni datos de medios de pago.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-zinc-900 mb-2">Tus derechos</h2>
            <p>
              Tenés derecho a acceder, rectificar o solicitar la eliminación de tus datos personales.
              Para ejercer estos derechos, podés solicitarlo directamente al personal del restaurante
              durante tu visita o, si contás con el email de contacto del local, por ese medio.
            </p>
            <p className="mt-2 text-zinc-500 text-sm">
              Esta plataforma cumple con la Ley N° 25.326 de Protección de los Datos Personales (Argentina).
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-zinc-900 mb-2">¿Por qué pedimos tu nombre y teléfono?</h2>
            <p>
              El sistema de pedidos por QR permite ordenar sin necesidad de interactuar con un mozo.
              Para garantizar que los pedidos sean genuinos y evitar abusos (pedidos falsos, bromas, o
              personas que se retiran sin abonar), es necesario que quien pide se identifique mínimamente.
              Esta medida protege tanto al restaurante como a los demás clientes que esperan ser atendidos.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-zinc-900 mb-2">Cambios a esta política</h2>
            <p>
              Podemos actualizar esta política ocasionalmente. La fecha de última actualización siempre
              estará visible al inicio de esta página. El uso continuado del sistema implica la aceptación
              de los términos vigentes.
            </p>
          </section>

          <div className="border-t border-zinc-200 pt-5 mt-8">
            <p className="text-zinc-400 text-xs text-center">
              Si tenés preguntas sobre esta política, consultá con el personal del restaurante.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
