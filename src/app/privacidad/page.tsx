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
              Recopilamos únicamente la información necesaria para operar el servicio,
              según el tipo de usuario:
            </p>
            <p className="mt-3 font-semibold text-zinc-800">Comensales (quienes hacen pedidos por QR):</p>
            <ul className="mt-1 space-y-1 list-disc list-inside text-zinc-600">
              <li><strong>Nombre</strong> — obtenido de tu cuenta de Google al confirmar el pedido.</li>
              <li><strong>Email</strong> — obtenido de tu cuenta de Google al confirmar el pedido.</li>
              <li><strong>Detalle del pedido</strong> — productos elegidos, cantidades y aclaraciones.</li>
              <li><strong>Modo de pago elegido</strong> — si pagás en caja o de otra forma.</li>
            </ul>
            <p className="mt-3 font-semibold text-zinc-800">Administradores y personal del restaurante:</p>
            <ul className="mt-1 space-y-1 list-disc list-inside text-zinc-600">
              <li><strong>Email</strong> — para identificar la cuenta y permitir el ingreso.</li>
              <li><strong>Nombre</strong> — etiqueta del acceso dentro del sistema.</li>
              <li>
                <strong>Contraseña</strong> — almacenada de forma segura usando bcrypt
                (función de hash unidireccional con 12 rondas de sal). No almacenamos
                la contraseña en texto plano ni podemos recuperarla.
              </li>
              <li><strong>Registro de actividad</strong> — acciones realizadas dentro del sistema (inicios de sesión, cambios de estado de pedidos, modificaciones de menú, etc.).</li>
            </ul>
            <p className="mt-2 text-zinc-500 text-sm">
              No recopilamos número de teléfono, documentos de identidad ni datos de tarjetas de crédito.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-zinc-900 mb-2">¿Para qué usamos tu información?</h2>
            <p>Usamos tus datos exclusivamente para:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside text-zinc-600">
              <li>Identificar tu pedido y vincularlo a tu mesa.</li>
              <li>Prevenir pedidos falsos o maliciosos que perjudican al restaurante.</li>
              <li>Gestionar el acceso del personal al sistema.</li>
              <li>Registrar la actividad del sistema para seguridad y auditoría interna.</li>
              <li>Cumplir con las obligaciones operativas y legales del restaurante.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-zinc-900 mb-2">Google y servicios de terceros</h2>
            <p>
              Usamos <strong>Google OAuth</strong> para autenticar comensales al confirmar pedidos
              y para el acceso del personal. Al iniciar sesión con Google, recibimos tu email y
              nombre desde tu cuenta de Google. No recibimos ni almacenamos tu contraseña de Google.
            </p>
            <p className="mt-2">
              La infraestructura del sistema corre sobre <strong>Supabase</strong> (base de datos y
              autenticación) y <strong>Vercel</strong> (hosting). Estos proveedores tienen sus propias
              políticas de privacidad y seguridad.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-zinc-900 mb-2">Cookies</h2>
            <p>El sistema utiliza las siguientes cookies:</p>
            <ul className="mt-2 space-y-2 list-disc list-inside text-zinc-600">
              <li>
                <strong>admin_token</strong> — cookie de sesión para administradores. Dura 8 horas.
                Es httpOnly (no accesible desde JavaScript) y secure (solo HTTPS).
              </li>
              <li>
                <strong>staff_pending</strong> — cookie temporal durante el inicio de sesión del
                personal. Dura 10 minutos. httpOnly y secure.
              </li>
              <li>
                <strong>pqr_return</strong> — guarda la URL de retorno durante el flujo de Google
                OAuth. Dura 5 minutos y se elimina automáticamente al completar el login.
              </li>
              <li>
                <strong>Cookies de Supabase</strong> — gestionadas por Supabase para mantener la
                sesión de Google. Se eliminan al cerrar sesión.
              </li>
            </ul>
            <p className="mt-2 text-zinc-500 text-sm">
              No utilizamos cookies de publicidad, seguimiento ni analytics de terceros.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-zinc-900 mb-2">¿Compartimos tu información con terceros?</h2>
            <p>
              <strong>No.</strong> Tu información personal no es vendida, alquilada ni compartida con
              empresas de marketing ni terceros ajenos al restaurante. Solo el personal del local
              (cocina, caja, mozos) tiene acceso a los datos necesarios para atenderte.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-zinc-900 mb-2">¿Cuánto tiempo guardamos tus datos?</h2>
            <p>
              Los datos de los comensales (nombre, email, detalle del pedido) se conservan mientras
              la cuenta del restaurante esté activa, para gestión operativa y resolución de reclamos.
            </p>
            <p className="mt-2">
              Los datos del personal (email, nombre, registro de actividad) se conservan mientras
              el acceso esté vigente y hasta 30 días después de su revocación o cierre de cuenta.
            </p>
            <p className="mt-2">
              Podés solicitar la eliminación de tus datos en cualquier momento (ver sección "Tus derechos").
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-zinc-900 mb-2">¿Cómo protegemos tu información?</h2>
            <ul className="mt-2 space-y-1 list-disc list-inside text-zinc-600">
              <li>Toda la comunicación viaja cifrada mediante HTTPS.</li>
              <li>Las contraseñas se almacenan con bcrypt (hash unidireccional, nunca en texto plano).</li>
              <li>Las sesiones usan tokens JWT con expiración y cookies httpOnly.</li>
              <li>El sistema aplica rate limiting para prevenir ataques de fuerza bruta.</li>
              <li>Solo el personal autorizado puede acceder a los datos de pedidos.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-zinc-900 mb-2">Tus derechos</h2>
            <p>
              De acuerdo con la Ley N° 25.326 de Protección de los Datos Personales (Argentina),
              tenés derecho a acceder, rectificar y solicitar la eliminación de tus datos personales
              (derechos ARCO).
            </p>
            <p className="mt-2">
              Para ejercer estos derechos podés solicitarlo directamente al personal del restaurante
              durante tu visita o, si contás con el email de contacto del local, por ese medio.
            </p>
            <p className="mt-2 text-zinc-500 text-sm">
              También podés presentar un reclamo ante la Agencia de Acceso a la Información Pública
              (AAIP) en{" "}
              <a
                href="https://www.argentina.gob.ar/aaip"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-zinc-700"
              >
                www.argentina.gob.ar/aaip
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-zinc-900 mb-2">Cambios a esta política</h2>
            <p>
              Podemos actualizar esta política ocasionalmente. La fecha de última actualización
              estará siempre visible al inicio de esta página. El uso continuado del sistema
              implica la aceptación de los términos vigentes.
            </p>
          </section>

          <div className="border-t border-zinc-200 pt-5 mt-8 flex flex-col items-center gap-2">
            <p className="text-zinc-400 text-xs text-center">
              Si tenés preguntas sobre esta política, consultá con el personal del restaurante.
            </p>
            <a href="/terminos" className="text-zinc-400 text-xs underline hover:text-zinc-600">
              Ver Términos de Servicio
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
