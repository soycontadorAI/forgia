// Catálogo de movimientos para la guía "Cómo se hace". El WOD generado trae los
// movimientos como texto libre ("12 Toes-to-Bar", "Peso Muerto (70 kg)"), así
// que se reconocen aquí, en código, con alias en inglés y español.

export type MovementCategory = 'halterofilia' | 'fuerza' | 'gimnasticos' | 'cardio' | 'peso-corporal' | 'accesorios';

export interface Movement {
  id: string;
  name: string;
  category: MovementCategory;
  /** Formas en que puede aparecer en el texto, en minúsculas y sin acentos */
  aliases: string[];
  /** Puntos de técnica, en el orden en que importan */
  cues: string[];
  /** ID de un video de demostración curado (YouTube); vacío hasta revisarlo a mano */
  videoId?: string;
}

export const MOVEMENTS: Movement[] = [
  // --- Halterofilia ---
  { id: 'snatch', name: 'Snatch', category: 'halterofilia', aliases: ['squat snatch', 'snatch', 'arranque'], cues: ['Agarre amplio, espalda neutra y hombros por encima de la barra al despegar.', 'Extiende cadera y rodillas completas antes de jalarte debajo de la barra.', 'Recibe en sentadilla con brazos bloqueados y la barra sobre el centro del pie.'] },
  { id: 'power-snatch', name: 'Power Snatch', category: 'halterofilia', aliases: ['power snatch'], cues: ['Mismo arranque que el snatch: barra pegada al cuerpo.', 'Recibe arriba de paralelo con brazos bloqueados.', 'Pies de ancho de cadera a ancho de sentadilla al aterrizar.'] },
  { id: 'hang-snatch', name: 'Hang Snatch', category: 'halterofilia', aliases: ['hang power snatch', 'hang snatch'], cues: ['Empieza de pie y baja la barra a medio muslo con cadera atrás.', 'Extiende fuerte la cadera; la barra sube pegada.', 'Jálate debajo y bloquea arriba.'] },
  { id: 'clean', name: 'Clean', category: 'halterofilia', aliases: ['squat clean', 'clean', 'cargada'], cues: ['Despega con espalda neutra y la barra cerca de las espinillas.', 'Extensión completa de cadera antes de bajar a recibir.', 'Recibe en front rack con codos altos y apoyo en talones.'] },
  { id: 'power-clean', name: 'Power Clean', category: 'halterofilia', aliases: ['power clean'], cues: ['Barra pegada al cuerpo todo el recorrido.', 'Codos rápidos al frente al recibir.', 'Recibe arriba de paralelo con el pecho erguido.'] },
  { id: 'hang-clean', name: 'Hang Clean', category: 'halterofilia', aliases: ['hang power clean', 'hang squat clean', 'hang clean'], cues: ['Desde medio muslo, cadera atrás y hombros sobre la barra.', 'Extiende y encoge hombros; los brazos solo guían.', 'Codos al frente al recibir.'] },
  { id: 'clean-and-jerk', name: 'Clean & Jerk', category: 'halterofilia', aliases: ['clean & jerk', 'clean and jerk', 'clean y jerk', 'envion'], cues: ['Clean completo y ponte de pie estable antes del jerk.', 'Dip corto con el torso vertical, empuja con piernas.', 'Mete el cuerpo debajo y bloquea brazos; recupera los pies.'] },
  { id: 'push-jerk', name: 'Push Jerk', category: 'halterofilia', aliases: ['push jerk', 'split jerk', 'jerk'], cues: ['Dip y drive con el torso vertical y talones abajo.', 'Empuja la barra y mete el cuerpo debajo.', 'Bloquea brazos con la barra sobre la nuca.'] },
  { id: 'push-press', name: 'Push Press', category: 'fuerza', aliases: ['push press'], cues: ['Dip corto, rodillas al frente, torso vertical.', 'La fuerza sale de piernas; termina con los brazos.', 'Cabeza adelante al bloquear, sin arquear la espalda.'] },
  { id: 'strict-press', name: 'Strict Press', category: 'fuerza', aliases: ['strict press', 'shoulder press', 'press estricto', 'press militar'], cues: ['Glúteos y abdomen apretados, sin mover piernas.', 'Retira la cabeza para que pase la barra y regresa.', 'Bloquea con bíceps junto a las orejas.'] },
  { id: 'thruster', name: 'Thruster', category: 'halterofilia', aliases: ['barbell thruster', 'thruster'], cues: ['Sentadilla frontal con codos altos, debajo de paralelo.', 'Sube explosivo y usa ese impulso para empujar sobre la cabeza.', 'Un solo movimiento continuo; respira arriba.'] },
  { id: 'overhead-squat', name: 'Overhead Squat', category: 'halterofilia', aliases: ['overhead squat', 'ohs', 'sentadilla overhead'], cues: ['Agarre amplio, brazos bloqueados y axilas al frente.', 'Barra sobre el centro del pie todo el recorrido.', 'Torso lo más vertical posible; baja controlado.'] },
  { id: 'sdhp', name: 'Sumo Deadlift High Pull', category: 'halterofilia', aliases: ['sumo deadlift high pull', 'sdhp'], cues: ['Postura sumo y agarre cerrado.', 'Extiende cadera primero y luego jala con codos altos.', 'Baja en el orden inverso: brazos, luego cadera.'] },

  // --- Fuerza ---
  { id: 'back-squat', name: 'Back Squat', category: 'fuerza', aliases: ['back squat', 'sentadilla trasera', 'sentadilla con barra'], cues: ['Barra sobre trapecios, abdomen apretado antes de bajar.', 'Rodillas en línea con los pies; cadera debajo de las rodillas.', 'Sube empujando el piso con todo el pie.'] },
  { id: 'front-squat', name: 'Front Squat', category: 'fuerza', aliases: ['front squat', 'sentadilla frontal'], cues: ['Codos altos y barra sobre los hombros.', 'Torso vertical; baja entre las piernas.', 'Sube guiando con los codos.'] },
  { id: 'deadlift', name: 'Deadlift', category: 'fuerza', aliases: ['sumo deadlift', 'deadlift', 'peso muerto'], cues: ['Barra sobre el centro del pie y espinillas cerca.', 'Espalda neutra: empuja el piso, no jales con la espalda.', 'Termina con cadera extendida, sin echarte atrás.'] },
  { id: 'bench-press', name: 'Bench Press', category: 'fuerza', aliases: ['bench press', 'press de banca', 'press banca'], cues: ['Escápulas juntas y pies firmes en el piso.', 'Baja controlado a la parte baja del pecho.', 'Empuja hacia atrás en diagonal hasta bloquear.'] },
  { id: 'goblet-squat', name: 'Goblet Squat', category: 'fuerza', aliases: ['goblet squat'], cues: ['Peso pegado al pecho con codos abajo.', 'Baja entre las piernas con el torso erguido.', 'Rodillas hacia afuera en línea con los pies.'] },
  { id: 'good-morning', name: 'Good Morning', category: 'accesorios', aliases: ['good morning'], cues: ['Rodillas ligeramente flexionadas y espalda neutra.', 'Lleva la cadera atrás hasta sentir los isquiotibiales.', 'Sube apretando glúteos.'] },

  // --- Gimnásticos ---
  { id: 'pull-up', name: 'Pull-up', category: 'gimnasticos', aliases: ['chest to bar', 'c2b', 'kipping pull-up', 'strict pull-up', 'pull-ups', 'pull-up', 'pullups', 'pullup', 'dominadas', 'dominada'], cues: ['Empieza colgado con brazos extendidos y hombros activos.', 'Barbilla por encima de la barra en cada rep.', 'Si escalas: banda o jumping pull-ups, mismo rango.'] },
  { id: 'toes-to-bar', name: 'Toes-to-Bar', category: 'gimnasticos', aliases: ['toes-to-bar', 'toes to bar', 't2b', 'ttb'], cues: ['Kip desde el hombro: empuja la barra hacia abajo con brazos rectos.', 'Lleva ambos pies a tocar la barra al mismo tiempo.', 'Escala con knee raises o V-ups.'] },
  { id: 'knee-raise', name: 'Hanging Knee Raise', category: 'gimnasticos', aliases: ['hanging knee raises', 'hanging knee raise', 'knee raises', 'knee raise', 'elevaciones de rodilla'], cues: ['Cuelga con hombros activos, sin balancearte.', 'Lleva las rodillas al pecho con control.', 'Baja despacio para no generar impulso.'] },
  { id: 'muscle-up', name: 'Muscle-up', category: 'gimnasticos', aliases: ['ring muscle-up', 'bar muscle-up', 'muscle-ups', 'muscle-up', 'muscle up'], cues: ['Kip fuerte y lleva la cadera hacia la barra o las anillas.', 'Transición rápida: pecho por encima de las manos.', 'Termina con un fondo hasta bloquear los brazos.'] },
  { id: 'hspu', name: 'Handstand Push-up', category: 'gimnasticos', aliases: ['handstand push-ups', 'handstand push-up', 'handstand push up', 'hspu'], cues: ['Manos un poco más anchas que los hombros, cabeza al frente formando un triángulo.', 'Baja controlado hasta tocar la cabeza.', 'Escala con pike push-ups o con abmat.'] },
  { id: 'handstand-walk', name: 'Handstand Walk', category: 'gimnasticos', aliases: ['handstand walk'], cues: ['Hombros sobre las manos y cuerpo apretado.', 'Pasos cortos con los dedos activos.', 'Mira al piso entre las manos.'] },
  { id: 'rope-climb', name: 'Rope Climb', category: 'gimnasticos', aliases: ['rope climbs', 'rope climb', 'trepar cuerda'], cues: ['Atrapa la cuerda con los pies (J-hook o S-wrap).', 'Ponte de pie con las piernas; los brazos solo sostienen.', 'Baja mano por mano, nunca deslizando.'] },
  { id: 'ring-row', name: 'Ring Row', category: 'gimnasticos', aliases: ['ring rows', 'ring row', 'remo en anillas'], cues: ['Cuerpo en plancha de pies a cabeza.', 'Jala el pecho a las anillas juntando escápulas.', 'Más horizontal = más difícil.'] },
  { id: 'ring-dip', name: 'Ring Dip', category: 'gimnasticos', aliases: ['ring dips', 'ring dip', 'dips', 'fondos'], cues: ['Empieza con brazos bloqueados y anillas pegadas al cuerpo.', 'Baja hasta que los hombros pasen los codos.', 'Escala con banda o en paralelas/caja.'] },
  { id: 'pistol', name: 'Pistol Squat', category: 'gimnasticos', aliases: ['pistol squats', 'pistol squat', 'pistols', 'pistol'], cues: ['Pierna libre al frente y brazos al frente para equilibrar.', 'Baja controlado con el talón apoyado.', 'Escala sentándote a una caja.'] },
  { id: 'ghd-sit-up', name: 'GHD Sit-up', category: 'gimnasticos', aliases: ['ghd sit-ups', 'ghd sit-up', 'ghd'], cues: ['Ajusta el GHD para que la cadera quede libre.', 'Baja hasta paralelo sin hiperextender al empezar.', 'Sube con las piernas y toca el frente.'] },

  // --- Peso corporal ---
  { id: 'burpee', name: 'Burpee', category: 'peso-corporal', aliases: ['burpee box jump over', 'burpee broad jump', 'bar-facing burpee', 'burpees', 'burpee'], cues: ['Pecho y cadera tocan el piso.', 'Regresa los pies con un salto y ponte de pie.', 'Salto pequeño con palmada arriba; respira en un ritmo constante.'] },
  { id: 'air-squat', name: 'Air Squat', category: 'peso-corporal', aliases: ['air squats', 'air squat', 'sentadillas', 'sentadilla libre'], cues: ['Pies al ancho de hombros, peso en todo el pie.', 'Cadera atrás y abajo, debajo de las rodillas.', 'Rodillas hacia afuera y pecho arriba.'] },
  { id: 'push-up', name: 'Push-up', category: 'peso-corporal', aliases: ['hand-release push-ups', 'push-ups', 'push-up', 'push ups', 'lagartijas', 'flexiones'], cues: ['Cuerpo en plancha, sin dejar caer la cadera.', 'Codos a unos 45° del cuerpo.', 'Pecho al piso y bloquea arriba; escala con rodillas o caja.'] },
  { id: 'lunge', name: 'Lunge', category: 'peso-corporal', aliases: ['walking lunges', 'walking lunge', 'sandbag lunges', 'lunges', 'lunge', 'zancadas', 'zancada'], cues: ['Paso largo y torso erguido.', 'La rodilla de atrás toca suave el piso.', 'Empuja con el talón de enfrente para subir.'] },
  { id: 'box-jump', name: 'Box Jump', category: 'peso-corporal', aliases: ['box jump overs', 'box jump over', 'box jumps', 'box jump', 'salto al cajon', 'saltos al cajon'], cues: ['Brazos y cadera cargan el salto.', 'Aterriza con todo el pie y extiende cadera arriba.', 'Baja dando un paso si hay muchas reps (cuida el tendón de Aquiles).'] },
  { id: 'step-up', name: 'Step-up', category: 'peso-corporal', aliases: ['box step-ups', 'step-ups', 'step-up', 'step ups'], cues: ['Todo el pie sobre la caja o banco.', 'Sube empujando con la pierna de arriba, no con la de abajo.', 'Extiende cadera arriba y baja controlado.'] },
  { id: 'sit-up', name: 'Sit-up', category: 'peso-corporal', aliases: ['abmat sit-ups', 'abmat sit-up', 'sit-ups', 'sit-up', 'abdominales'], cues: ['Plantas juntas o pies en el piso con abmat en la zona lumbar.', 'Toca el piso detrás de la cabeza.', 'Sube y toca los pies.'] },
  { id: 'v-up', name: 'V-up', category: 'peso-corporal', aliases: ['v-ups', 'v-up'], cues: ['Empieza acostado y extendido.', 'Sube piernas y torso a la vez para tocar los pies.', 'Baja controlado sin golpear el piso.'] },
  { id: 'plank', name: 'Plank', category: 'peso-corporal', aliases: ['plank', 'plancha'], cues: ['Codos debajo de los hombros.', 'Glúteos y abdomen apretados, cuerpo en línea.', 'Respira sin perder la posición.'] },
  { id: 'mountain-climber', name: 'Mountain Climber', category: 'peso-corporal', aliases: ['mountain climbers', 'mountain climber', 'escaladores'], cues: ['Manos debajo de los hombros y cadera baja.', 'Lleva las rodillas al pecho alternando.', 'Ritmo constante sin rebotar la cadera.'] },
  { id: 'jumping-jack', name: 'Jumping Jack', category: 'peso-corporal', aliases: ['jumping jacks', 'jumping jack'], cues: ['Salta abriendo piernas y brazos a la vez.', 'Aterriza suave en la punta de los pies.', 'Ritmo constante para calentar.'] },
  { id: 'inchworm', name: 'Inchworm', category: 'peso-corporal', aliases: ['inchworms', 'inchworm'], cues: ['Desde de pie, manos al piso con piernas casi rectas.', 'Camina con las manos hasta plancha.', 'Regresa caminando con los pies hacia las manos.'] },
  { id: 'pvc-pass-through', name: 'PVC Pass-through', category: 'accesorios', aliases: ['pvc pass-throughs', 'pvc pass-through', 'pass-throughs', 'pass throughs'], cues: ['Agarre amplio y brazos rectos.', 'Pasa el PVC por encima de la cabeza hasta atrás.', 'Cierra el agarre conforme gane movilidad.'] },

  // --- Kettlebell / mancuerna / carga ---
  { id: 'kb-swing', name: 'Kettlebell Swing', category: 'accesorios', aliases: ['russian kettlebell swings', 'russian kettlebell swing', 'american kettlebell swing', 'kettlebell swings', 'kettlebell swing', 'kb swings', 'kb swing', 'russian swing'], cues: ['Bisagra de cadera, no sentadilla.', 'La cadera lanza la pesa; los brazos solo la guían.', 'Ruso: a la altura de los ojos. Americano: sobre la cabeza.'] },
  { id: 'wall-ball', name: 'Wall Ball', category: 'accesorios', aliases: ['wall ball shots', 'wall balls', 'wall ball'], cues: ['Sentadilla completa con el balón al pecho.', 'Sube explosivo y lanza al objetivo.', 'Recibe el balón bajando a la siguiente sentadilla; rompe series temprano.'] },
  { id: 'db-snatch', name: 'Dumbbell Snatch', category: 'halterofilia', aliases: ['dumbbell snatches', 'dumbbell snatch', 'db snatch'], cues: ['Mancuerna entre los pies, espalda neutra.', 'Extiende cadera y jala pegada al cuerpo.', 'Bloquea arriba con el bíceps junto a la oreja.'] },
  { id: 'db-thruster', name: 'Dumbbell Thruster', category: 'accesorios', aliases: ['dumbbell thrusters', 'dumbbell thruster', 'db thruster'], cues: ['Mancuernas en los hombros con codos al frente.', 'Sentadilla completa y empuja al subir.', 'Un solo movimiento continuo.'] },
  { id: 'farmer-carry', name: 'Farmer Carry', category: 'accesorios', aliases: ["farmer's carry", 'farmers carry', 'farmer carry'], cues: ['Hombros atrás y abajo, abdomen apretado.', 'Pasos cortos y rápidos.', 'Agarre firme; no dejes que el peso te incline.'] },

  // --- Cardio ---
  { id: 'row', name: 'Remo (rower)', category: 'cardio', aliases: ['cal row', 'rowing', 'rower', 'row', 'remo'], cues: ['Orden: piernas, cadera, brazos; regreso al revés.', 'Unos 60% de la fuerza sale de las piernas.', 'Tirón largo y regreso controlado.'] },
  { id: 'bike', name: 'Assault Bike', category: 'cardio', aliases: ['assault bike', 'air bike', 'echo bike', 'bike erg', 'bike'], cues: ['Asiento a una altura que deje la rodilla casi recta abajo.', 'Empuja y jala con brazos y piernas.', 'Busca un ritmo que puedas sostener.'] },
  { id: 'ski-erg', name: 'Ski Erg', category: 'cardio', aliases: ['ski erg', 'skierg', 'ski'], cues: ['Brazos casi rectos arriba.', 'Jala con dorsales y bisagra de cadera.', 'Termina con manos a la altura de los muslos.'] },
  { id: 'run', name: 'Carrera', category: 'cardio', aliases: ['shuttle runs', 'shuttle run', 'run', 'running', 'correr', 'carrera', 'trote'], cues: ['Pisada debajo de la cadera, pasos cortos.', 'Brazos relajados a 90°.', 'Arranca más lento de lo que crees en distancias largas.'] },
  { id: 'double-under', name: 'Double Under', category: 'cardio', aliases: ['double-unders', 'double unders', 'double-under', 'double under', 'dus', 'du'], cues: ['Salto un poco más alto que en simples, cuerpo recto.', 'Las muñecas giran la cuerda, no los brazos.', 'Escala con el triple de saltos simples.'] },
  { id: 'single-under', name: 'Saltos de cuerda', category: 'cardio', aliases: ['single-unders', 'single unders', 'jump rope', 'saltar la cuerda', 'saltar cuerda'], cues: ['Saltos pequeños en la punta de los pies.', 'Codos pegados y giro desde las muñecas.', 'Mira al frente, no a la cuerda.'] },
  { id: 'sled-push', name: 'Sled Push', category: 'cardio', aliases: ['sled push', 'sled pull', 'trineo'], cues: ['Cuerpo a unos 45° con brazos extendidos o flexionados.', 'Pasos cortos y potentes.', 'Mantén el ritmo; no te detengas a mitad.'] },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9&'\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Alias más largos primero: "power clean" gana a "clean", "dumbbell thruster" a "thruster"
const ALIAS_INDEX: { alias: string; movement: Movement }[] = MOVEMENTS.flatMap((movement) =>
  movement.aliases.map((alias) => ({ alias: normalize(alias), movement }))
).sort((a, b) => b.alias.length - a.alias.length);

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Devuelve el movimiento que aparece en un renglón del WOD, si se reconoce. */
export function matchMovement(text: string): Movement | null {
  const haystack = ` ${normalize(text)} `;
  for (const { alias, movement } of ALIAS_INDEX) {
    if (new RegExp(`[\\s(]${escapeRegExp(alias)}s?[\\s),]`).test(haystack)) return movement;
  }
  return null;
}

export function youtubeSearchUrl(movement: Movement): string {
  const query = `${movement.name} técnica crossfit`.replace(/\s+/g, '+');
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query).replace(/%2B/g, '+')}`;
}
