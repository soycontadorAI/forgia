import type { Metadata } from 'next';
import LegalPageLayout from '@/components/LegalPageLayout';

export const metadata: Metadata = {
  title: 'Aviso de Privacidad — Forgia',
};

export default function PrivacidadPage() {
  return (
    <LegalPageLayout>
      <h1 className="text-3xl md:text-4xl font-bold mb-2 text-neutral-900 dark:text-neutral-100">
        Aviso de Privacidad
      </h1>
      <p className="text-sm text-neutral-500 mb-8">Última actualización: 8 de febrero de 2026</p>

      <h2 className="text-xl md:text-2xl font-semibold mt-10 mb-4 text-neutral-900 dark:text-neutral-100">
        1. Identidad del responsable
      </h2>
      <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
        Forgia (en adelante, &quot;la plataforma&quot;) es responsable del tratamiento de los datos personales que usted proporciona al utilizar nuestros servicios. Para cualquier consulta relacionada con la privacidad de sus datos, puede contactarnos en:{' '}
        <strong>privacidad@forgia.fit</strong>.
      </p>

      <h2 className="text-xl md:text-2xl font-semibold mt-10 mb-4 text-neutral-900 dark:text-neutral-100">
        2. Datos personales recabados
      </h2>
      <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
        Para brindarle nuestros servicios de generación personalizada de entrenamientos, recabamos los siguientes datos personales:
      </p>
      <ul className="list-disc list-inside space-y-2 mb-4 text-neutral-700 dark:text-neutral-300">
        <li>Correo electrónico</li>
        <li>Nombre o alias</li>
        <li>Edad</li>
        <li>Historial de lesiones</li>
        <li>Objetivos de entrenamiento</li>
        <li>Tipo de entrenamiento preferido</li>
        <li>Nivel de equipamiento disponible</li>
        <li>Entrenamientos generados (WODs)</li>
        <li>Retroalimentación de entrenamientos (dificultad percibida, tiempo, notas)</li>
      </ul>

      <h2 className="text-xl md:text-2xl font-semibold mt-10 mb-4 text-neutral-900 dark:text-neutral-100">
        3. Finalidades del tratamiento
      </h2>
      <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
        Sus datos personales serán utilizados para las siguientes finalidades:
      </p>
      <ul className="list-disc list-inside space-y-2 mb-4 text-neutral-700 dark:text-neutral-300">
        <li><strong>Personalización de entrenamientos:</strong> Generar WODs adaptados a su perfil físico, nivel de experiencia, equipamiento y objetivos.</li>
        <li><strong>Generación con inteligencia artificial:</strong> Enviar información de su perfil a modelos de IA para crear entrenamientos únicos.</li>
        <li><strong>Análisis de retroalimentación:</strong> Procesar su feedback post-entrenamiento para ajustar la intensidad y variedad de futuros WODs.</li>
        <li><strong>Mejora del servicio:</strong> Analizar patrones de uso para mejorar la calidad de los entrenamientos generados.</li>
      </ul>

      <h2 className="text-xl md:text-2xl font-semibold mt-10 mb-4 text-neutral-900 dark:text-neutral-100">
        4. Transferencias a terceros
      </h2>
      <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
        Para la prestación de nuestros servicios, sus datos pueden ser transferidos a los siguientes proveedores:
      </p>
      <ul className="list-disc list-inside space-y-2 mb-4 text-neutral-700 dark:text-neutral-300">
        <li><strong>Anthropic (API de Claude):</strong> Sólo si usted lo permite de forma expresa dentro de la aplicación, se envían su perfil de entrenamiento (edad, sexo, peso, estatura, nivel, objetivos, equipo y frecuencia), las lesiones o limitaciones que registre, sus entrenamientos, resultados, notas y récords recientes, y los mensajes que escriba al Coach IA, para generar entrenamientos, análisis y respuestas. No se envían su nombre, correo ni contraseña. Anthropic procesa estos datos conforme a sus términos comerciales, que excluyen su uso para entrenar modelos. Puede retirar este permiso en cualquier momento desde Cuenta → Coach con IA; al hacerlo dejan de enviarse sus datos y las funciones de IA se desactivan.</li>
        <li><strong>Supabase:</strong> Almacenamiento seguro de datos de cuenta, perfil, entrenamientos y retroalimentación. Gestión de autenticación de usuarios.</li>
      </ul>

      <h2 className="text-xl md:text-2xl font-semibold mt-10 mb-4 text-neutral-900 dark:text-neutral-100">
        5. Derechos ARCO
      </h2>
      <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
        Usted tiene derecho a Acceder, Rectificar, Cancelar u Oponerse al tratamiento de sus datos personales (derechos ARCO). Para ejercer cualquiera de estos derechos, envíe una solicitud a{' '}
        <strong>privacidad@forgia.fit</strong> indicando:
      </p>
      <ul className="list-disc list-inside space-y-2 mb-4 text-neutral-700 dark:text-neutral-300">
        <li>Su nombre completo y correo electrónico asociado a la cuenta</li>
        <li>Descripción clara del derecho que desea ejercer</li>
        <li>Cualquier documento que acredite su identidad</li>
      </ul>
      <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
        Responderemos a su solicitud en un plazo máximo de 20 días hábiles.
      </p>
      <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
        También puede eliminar su cuenta en cualquier momento desde la aplicación, en <strong>Cuenta → Eliminar cuenta</strong>. La eliminación es inmediata y borra su perfil, entrenamientos, resultados, récords y programas de forma permanente.
      </p>

      <h2 className="text-xl md:text-2xl font-semibold mt-10 mb-4 text-neutral-900 dark:text-neutral-100">
        6. Uso de cookies y almacenamiento local
      </h2>
      <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
        Forgia utiliza las siguientes tecnologías de almacenamiento:
      </p>
      <ul className="list-disc list-inside space-y-2 mb-4 text-neutral-700 dark:text-neutral-300">
        <li><strong>Cookies de sesión:</strong> Necesarias para la autenticación y mantenimiento de su sesión activa.</li>
        <li><strong>Notificaciones push:</strong> Si activa los recordatorios, guardamos la suscripción de su navegador (una dirección técnica del servicio de avisos), su zona horaria y la hora elegida, sólo para enviarle el aviso de entrenamiento. Puede desactivarlos en Cuenta → Recordatorios.</li>
        <li><strong>Almacenamiento local (localStorage):</strong> Utilizado para guardar preferencias de tema (modo claro/oscuro) y datos temporales de la aplicación.</li>
      </ul>

      <h2 className="text-xl md:text-2xl font-semibold mt-10 mb-4 text-neutral-900 dark:text-neutral-100">
        7. Cambios al aviso de privacidad
      </h2>
      <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
        Nos reservamos el derecho de actualizar este aviso de privacidad en cualquier momento. Las modificaciones serán notificadas a través de la plataforma. Le recomendamos revisar periódicamente este aviso para mantenerse informado sobre cómo protegemos sus datos.
      </p>

      <h2 className="text-xl md:text-2xl font-semibold mt-10 mb-4 text-neutral-900 dark:text-neutral-100">
        8. Consentimiento
      </h2>
      <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
        Al crear una cuenta en Forgia y aceptar los Términos y Condiciones, usted otorga su consentimiento para el tratamiento de sus datos personales conforme a lo descrito en el presente aviso de privacidad.
      </p>

      <h2 className="text-xl md:text-2xl font-semibold mt-10 mb-4 text-neutral-900 dark:text-neutral-100">
        9. Fecha de última actualización
      </h2>
      <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
        Este aviso de privacidad fue actualizado por última vez el 8 de febrero de 2026.
      </p>
    </LegalPageLayout>
  );
}
