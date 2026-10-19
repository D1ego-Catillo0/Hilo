import { ArrowLeft, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/layout/Logo'
import { formatDate } from '../domain/dates'
import { isPending, LEGAL } from '../legal/config'

function Field({ value }: { value: string }) {
  return isPending(value) ? <mark className="rounded bg-warning-soft px-1 text-warning">{value}</mark> : <strong>{value}</strong>
}

function Shell({ title, children }: { title: string; children: ReactNode }) {
  const pending = [LEGAL.responsable, LEGAL.domicilio, LEGAL.correo].some(isPending)
  return (
    <div className="min-h-screen bg-app">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/" aria-label="Hilo, ir al inicio">
            <Logo />
          </Link>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
            <ArrowLeft size={16} aria-hidden="true" /> Volver a Hilo
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        <p className="mt-1 text-sm text-muted">
          Versión {LEGAL.version} · Actualizado el {formatDate(LEGAL.actualizado)}
        </p>
        <div role="note" className="mt-4 flex gap-3 rounded-xl border border-warning/30 bg-warning-soft p-4 text-sm text-ink">
          <TriangleAlert size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
          <p>
            <strong>Borrador pendiente de revisión legal.</strong> Este texto es una base de trabajo y no sustituye la asesoría de un abogado. Debe revisarse antes de ofrecer Hilo a clientes reales.
            {pending && ' Los campos resaltados deben completarse en src/legal/config.ts.'}
          </p>
        </div>
        <article className="mt-6 space-y-6 rounded-xl border border-line bg-surface p-6 text-[15px] leading-relaxed text-ink shadow-card [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-2 [&_ul]:mt-2 [&_ul]:space-y-1">
          {children}
        </article>
        <nav aria-label="Documentos legales" className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link to="/privacidad" className="text-brand hover:underline">Aviso de privacidad</Link>
          <Link to="/terminos" className="text-brand hover:underline">Términos de uso</Link>
          <Link to="/derechos-de-autor" className="text-brand hover:underline">Derechos de autor</Link>
        </nav>
      </main>
    </div>
  )
}

export function PrivacyPage() {
  return (
    <Shell title="Aviso de privacidad">
      <section>
        <h2>1. Quién es el responsable</h2>
        <p>
          <Field value={LEGAL.responsable} />, con domicilio en <Field value={LEGAL.domicilio} />, es responsable del tratamiento de los datos personales que se recaban a través de Hilo, conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).
        </p>
      </section>
      <section>
        <h2>2. Dos papeles distintos</h2>
        <p>
          <strong>Datos de tu cuenta (usuarios de Hilo).</strong> Para ellos, el responsable es quien se indica arriba.
        </p>
        <p>
          <strong>Datos de tus clientes y pedidos.</strong> Cuando un negocio registra clientes y pedidos en Hilo, ese negocio decide para qué los usa y es responsable frente a sus clientes; Hilo los trata solo para prestarle el servicio, como encargado, y no los usa para fines propios.
        </p>
      </section>
      <section>
        <h2>3. Qué datos recabamos</h2>
        <ul>
          <li>De la cuenta: nombre o nombre del negocio, correo electrónico, usuario y, si inicias sesión con Google, el nombre y correo que Google comparte con Hilo.</li>
          <li>Del uso del negocio: clientes (nombre, teléfono, correo y notas), pedidos, descripciones y especificaciones, fechas, importes y pagos registrados.</li>
          <li>De pedidos recibidos por el formulario público: los datos que la persona escribe en el formulario (nombre, teléfono o correo, descripción del pedido).</li>
          <li>Técnicos mínimos: registros de acceso necesarios para la seguridad del servicio.</li>
        </ul>
        <p>Hilo no solicita datos sensibles, bancarios ni números de tarjeta, y no procesa pagos: solo registra los que el negocio captura.</p>
      </section>
      <section>
        <h2>4. Para qué se usan</h2>
        <p>Finalidades necesarias: crear y mantener tu cuenta, autenticarte, operar el servicio (gestionar pedidos, clientes y pagos), brindar soporte y proteger la seguridad del sistema. No usamos los datos para publicidad ni los vendemos.</p>
      </section>
      <section>
        <h2>5. Con quién se comparten</h2>
        <p>Los datos se alojan con proveedores de infraestructura que operan el servicio por cuenta de Hilo (base de datos, autenticación y alojamiento web) y, si eliges iniciar sesión con Google, con Google. Dichos proveedores pueden almacenar datos fuera de México. No se transfieren a terceros para fines propios de estos.</p>
      </section>
      <section>
        <h2>6. Derechos ARCO y revocación</h2>
        <p>
          Puedes acceder, rectificar, cancelar u oponerte al tratamiento de tus datos, y revocar tu consentimiento, escribiendo a <Field value={LEGAL.correo} /> con tu nombre, una forma de contactarte, la descripción de lo que solicitas y una copia de una identificación oficial. Responderemos en los plazos que marca la ley.
        </p>
        <p>Si eres cliente de un negocio que usa Hilo, dirige tu solicitud primero a ese negocio.</p>
      </section>
      <section>
        <h2>7. Conservación y seguridad</h2>
        <p>Conservamos los datos mientras tu cuenta esté activa y los eliminamos o devolvemos al finalizar el servicio, salvo obligación legal. Aplicamos medidas técnicas razonables (acceso con contraseña, aislamiento de datos entre negocios y conexiones cifradas); ningún sistema es completamente infalible.</p>
      </section>
      <section>
        <h2>8. Cambios a este aviso</h2>
        <p>Si cambia, publicaremos la nueva versión en esta página y, cuando el cambio sea importante, te pediremos de nuevo tu consentimiento.</p>
      </section>
      <section>
        <h2>9. Consentimiento</h2>
        <p>Al crear tu cuenta o usar Hilo declaras que leíste este aviso y consientes el tratamiento de tus datos para las finalidades descritas.</p>
      </section>
    </Shell>
  )
}

export function TermsPage() {
  return (
    <Shell title="Términos de uso">
      <section>
        <h2>1. Qué es Hilo</h2>
        <p>Hilo es una herramienta para que negocios que trabajan por encargo organicen clientes, pedidos, fechas de entrega y pagos recibidos. Hilo <strong>no procesa pagos</strong>, no verifica transferencias ni depósitos y no emite comprobantes fiscales.</p>
      </section>
      <section>
        <h2>2. Acceso por invitación</h2>
        <p>El acceso es solo para negocios a los que el responsable (<Field value={LEGAL.responsable} />) les creó una cuenta. No es posible registrarse por cuenta propia. Eres responsable de cuidar tu contraseña y de la actividad realizada con tu cuenta.</p>
      </section>
      <section>
        <h2>3. Uso aceptable</h2>
        <ul>
          <li>Usa Hilo solo para fines lícitos y para datos que tengas derecho a registrar.</li>
          <li>No intentes acceder a datos de otros negocios, alterar el servicio ni sobrecargarlo.</li>
          <li>Eres responsable de informar a tus clientes sobre el uso de sus datos y de contar con su consentimiento cuando la ley lo exija.</li>
        </ul>
      </section>
      <section>
        <h2>4. Tus datos</h2>
        <p>Los datos que registras son tuyos. Puedes exportarlos y pedir su eliminación. Te recomendamos conservar respaldos propios.</p>
      </section>
      <section>
        <h2>5. Disponibilidad y límites de responsabilidad</h2>
        <p>El servicio se ofrece “tal cual”. Procuramos que funcione de forma continua, pero puede haber interrupciones, mantenimiento o pérdida de información. En la medida permitida por la ley, el responsable no responde por daños indirectos ni por decisiones de negocio tomadas con la información de Hilo.</p>
      </section>
      <section>
        <h2>6. Suspensión y terminación</h2>
        <p>El responsable puede suspender o dar de baja cuentas que incumplan estos términos o por terminación del servicio contratado, dando oportunidad razonable de exportar los datos.</p>
      </section>
      <section>
        <h2>7. Ley aplicable</h2>
        <p>Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Para controversias, las partes se someten a los tribunales competentes del domicilio del responsable. Contacto: <Field value={LEGAL.correo} />.</p>
      </section>
    </Shell>
  )
}

export function CopyrightPage() {
  return (
    <Shell title="Derechos de autor">
      <section>
        <h2>Titularidad</h2>
        <p>
          © {LEGAL.anioInicio} <Field value={LEGAL.responsable} />. Todos los derechos reservados. Hilo, su nombre, logotipo, diseño, textos y código son obra protegida por la Ley Federal del Derecho de Autor y tratados internacionales.
        </p>
      </section>
      <section>
        <h2>Lo que puedes hacer</h2>
        <p>Tu contratación te da una licencia limitada, no exclusiva e intransferible para usar Hilo mientras tu cuenta esté activa. No puedes copiar, revender, sublicenciar, descompilar ni crear obras derivadas del software.</p>
      </section>
      <section>
        <h2>Tu contenido</h2>
        <p>Los datos, descripciones y diseños que capturas de tus clientes y pedidos siguen siendo tuyos (o de quien corresponda). Nos autorizas solo a almacenarlos y mostrarlos para prestarte el servicio.</p>
      </section>
      <section>
        <h2>Componentes de terceros</h2>
        <p>Hilo usa software de código abierto (por ejemplo React, Tailwind CSS, Lucide, Dexie y la tipografía Inter), cada uno bajo su propia licencia, cuyos avisos se conservan en el código fuente.</p>
      </section>
      <section>
        <h2>Reportar una infracción</h2>
        <p>Si crees que algún contenido en Hilo infringe tus derechos, escribe a <Field value={LEGAL.correo} /> indicando qué obra y dónde aparece.</p>
      </section>
    </Shell>
  )
}
