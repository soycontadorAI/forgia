import type { Metadata } from 'next';
import LegalPageLayout from '@/components/LegalPageLayout';

export const metadata: Metadata = {
  title: 'Términos y Condiciones — Forgia',
};

export default function TerminosPage() {
  return (
    <LegalPageLayout>
      <h1 className="text-3xl md:text-4xl font-bold mb-2 text-neutral-900 dark:text-neutral-100">
        Términos y Condiciones
      </h1>
      <p className="text-sm text-neutral-500 mb-8">Última actualización: 8 de febrero de 2026</p>

      <h2 className="text-xl md:text-2xl font-semibold mt-10 mb-4 text-neutral-900 dark:text-neutral-100">
        1. Naturaleza del servicio
      </h2>
      <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
        Forgia es una plataforma de generación de entrenamientos (WODs) mediante inteligencia artificial. El servicio está diseñado como una herramienta de apoyo para personas que desean entrenar de forma estructurada.
      </p>
      <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
        Forgia <strong>no sustituye</strong> la supervisión de un entrenador personal certificado, médico deportivo o profesional de la salud. Los entrenamientos generados son sugerencias basadas en algoritmos de IA y la información proporcionada por el usuario.
      </p>

      <h2 className="text-xl md:text-2xl font-semibold mt-10 mb-4 text-neutral-900 dark:text-neutral-100">
        2. Registro y cuenta
      </h2>
      <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
        Para utilizar Forgia, usted debe:
      </p>
      <ul className="list-disc list-inside space-y-2 mb-4 text-neutral-700 dark:text-neutral-300">
        <li>Proporcionar un correo electrónico válido</li>
        <li>Tener al menos 13 años de edad</li>
        <li>Proporcionar información veraz en su perfil de entrenamiento</li>
        <li>Mantener la confidencialidad de sus credenciales de acceso</li>
      </ul>

      <h2 className="text-xl md:text-2xl font-semibold mt-10 mb-4 text-neutral-900 dark:text-neutral-100">
        3. Responsabilidades del usuario
      </h2>
      <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
        Al utilizar Forgia, usted se compromete a:
      </p>
      <ul className="list-disc list-inside space-y-2 mb-4 text-neutral-700 dark:text-neutral-300">
        <li>Utilizar el servicio de manera apropiada y conforme a estos términos</li>
        <li>Evaluar su propia capacidad física antes de realizar cualquier entrenamiento generado</li>
        <li>Informar de manera veraz sobre sus lesiones, limitaciones físicas y nivel de experiencia</li>
        <li>Consultar con un profesional de la salud si tiene condiciones médicas preexistentes</li>
        <li>No utilizar el servicio para fines distintos a los previstos</li>
      </ul>

      <h2 className="text-xl md:text-2xl font-semibold mt-10 mb-4 text-neutral-900 dark:text-neutral-100">
        4. Descargo de responsabilidad de salud
      </h2>
      <div className="border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 rounded-lg p-4 mb-4">
        <div className="flex gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
            <path d="M12 9v4"/>
            <path d="M12 17h.01"/>
          </svg>
          <p className="text-amber-800 dark:text-amber-200 leading-relaxed">
            <strong>Los entrenamientos generados por Forgia son sugerencias basadas en inteligencia artificial y NO sustituyen el consejo de un profesional de salud, entrenador certificado o médico deportivo.</strong> Consulta a un profesional antes de iniciar cualquier programa de ejercicios. Forgia no se hace responsable de lesiones, dolencias o cualquier consecuencia derivada de la realización de los entrenamientos generados.
          </p>
        </div>
      </div>

      <h2 className="text-xl md:text-2xl font-semibold mt-10 mb-4 text-neutral-900 dark:text-neutral-100">
        5. Limitación de responsabilidad
      </h2>
      <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
        Forgia no será responsable de:
      </p>
      <ul className="list-disc list-inside space-y-2 mb-4 text-neutral-700 dark:text-neutral-300">
        <li>Lesiones físicas derivadas de la realización de entrenamientos generados por la plataforma</li>
        <li>Daños causados por información inexacta proporcionada por el usuario en su perfil</li>
        <li>Limitaciones inherentes a los modelos de inteligencia artificial utilizados</li>
        <li>Interrupciones temporales del servicio por mantenimiento o causas de fuerza mayor</li>
        <li>Resultados físicos específicos, ya que estos dependen de múltiples factores individuales</li>
      </ul>

      <h2 className="text-xl md:text-2xl font-semibold mt-10 mb-4 text-neutral-900 dark:text-neutral-100">
        6. Propiedad intelectual
      </h2>
      <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
        La marca &quot;Forgia&quot;, el diseño de la plataforma y su código fuente son propiedad de sus creadores. Los entrenamientos generados por la IA son contenido creado para uso personal del usuario. Los datos personales y de entrenamiento que usted proporciona le pertenecen en todo momento.
      </p>

      <h2 className="text-xl md:text-2xl font-semibold mt-10 mb-4 text-neutral-900 dark:text-neutral-100">
        7. Uso de inteligencia artificial
      </h2>
      <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
        Forgia utiliza la API de Claude, de Anthropic, para generar entrenamientos, analizar retroalimentación y responder en el Coach IA. Esto implica que:
      </p>
      <ul className="list-disc list-inside space-y-2 mb-4 text-neutral-700 dark:text-neutral-300">
        <li>Los datos de su perfil se procesan y envían a servidores de Anthropic para generar contenido</li>
        <li>El contenido generado por IA puede contener imprecisiones o no ser óptimo para todos los usuarios</li>
        <li>La calidad de los entrenamientos depende en parte de la información que usted proporciona</li>
        <li>Los modelos de IA se actualizan periódicamente, lo que puede afectar el estilo de los entrenamientos</li>
      </ul>

      <h2 className="text-xl md:text-2xl font-semibold mt-10 mb-4 text-neutral-900 dark:text-neutral-100">
        8. Planes y pagos
      </h2>
      <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
        Forgia ofrece un plan gratuito con funciones limitadas y un plan de pago (Básico) por suscripción mensual o anual. Los precios vigentes se muestran en la sección Planes de la aplicación, en pesos mexicanos y con IVA incluido.
      </p>
      <ul className="list-disc list-inside space-y-2 mb-4 text-neutral-700 dark:text-neutral-300">
        <li><strong>Renovación automática:</strong> la suscripción se renueva al final de cada periodo y se cobra al método de pago registrado hasta que la cancele.</li>
        <li><strong>Prueba gratuita:</strong> la primera suscripción incluye 7 días de prueba. Si cancela antes de que terminen, no se realiza ningún cargo.</li>
        <li><strong>Cancelación:</strong> puede cancelar en cualquier momento desde Cuenta → Administrar suscripción. Conserva el plan hasta el final del periodo pagado y no se generan cargos posteriores.</li>
        <li><strong>Cambios de precio:</strong> se avisarán con al menos 30 días de anticipación y aplicarán a partir de la siguiente renovación. El precio Fundador se mantiene mientras la suscripción siga activa sin interrupción.</li>
        <li><strong>Procesamiento de pagos:</strong> los pagos los procesa Stripe. Forgia no almacena los datos completos de su tarjeta.</li>
      </ul>
      <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
        Si contrata desde la aplicación de iOS, el cobro, la renovación y la cancelación se rigen por las condiciones de Apple y se administran desde los ajustes de su cuenta de Apple.
      </p>

      <h2 className="text-xl md:text-2xl font-semibold mt-10 mb-4 text-neutral-900 dark:text-neutral-100">
        9. Cancelación y eliminación de cuenta
      </h2>
      <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
        Puede eliminar su cuenta y sus datos en cualquier momento desde Cuenta → Eliminar cuenta, o solicitarlo a <strong>privacidad@forgia.fit</strong>. Eliminar la cuenta no cancela una suscripción contratada a través de Apple; esa se cancela desde los ajustes de su cuenta de Apple. Para más información sobre sus derechos, consulte nuestro{' '}
        <a href="/privacidad" className="text-red-500 hover:text-red-600 underline">Aviso de Privacidad</a>.
      </p>

      <h2 className="text-xl md:text-2xl font-semibold mt-10 mb-4 text-neutral-900 dark:text-neutral-100">
        10. Modificaciones a los términos
      </h2>
      <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
        Forgia se reserva el derecho de modificar estos Términos y Condiciones en cualquier momento. Las modificaciones entrarán en vigor desde su publicación en la plataforma. El uso continuado del servicio después de la publicación de cambios constituye la aceptación de los mismos.
      </p>

      <h2 className="text-xl md:text-2xl font-semibold mt-10 mb-4 text-neutral-900 dark:text-neutral-100">
        11. Legislación aplicable
      </h2>
      <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
        Estos Términos y Condiciones se rigen por las leyes aplicables de los Estados Unidos Mexicanos. Cualquier controversia derivada del uso de la plataforma se resolverá conforme a la legislación mexicana vigente.
      </p>

      <h2 className="text-xl md:text-2xl font-semibold mt-10 mb-4 text-neutral-900 dark:text-neutral-100">
        12. Fecha de última actualización
      </h2>
      <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
        Estos Términos y Condiciones fueron actualizados por última vez el 21 de octubre de 2026.
      </p>
    </LegalPageLayout>
  );
}
