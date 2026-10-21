# API de Forgia — Contrato para clientes

Referencia de la superficie de API de forgia.fit, pensada para el cliente web
y para la futura app nativa de iOS. Última actualización: 2026-10-20.

## Arquitectura de acceso a datos

Forgia usa dos canales, igual que el cliente web:

1. **Supabase directo (con RLS)** — todo el CRUD de datos del usuario:
   `profiles`, `wods`, `workout_feedback`, `training_programs`,
   `personal_records`, `level_assessments`, `template_results`.
   Un cliente iOS debe usar [supabase-swift](https://github.com/supabase/supabase-swift)
   con las mismas políticas RLS; no hay endpoints REST propios para estas tablas.
2. **API routes de Next.js** (este documento) — funciones con IA (Claude) y
   lógica de servidor. Son las únicas rutas que requieren la API key de Anthropic
   y por eso viven en el servidor.

## Autenticación

Todas las rutas requieren un usuario autenticado de Supabase. Se aceptan dos
mecanismos (ver `src/lib/api-auth.ts`):

| Cliente | Mecanismo |
|---|---|
| Web | Cookie de sesión de Supabase (automática vía `@supabase/ssr`) |
| Nativo (iOS) | Header `Authorization: Bearer <access_token>` con el JWT de la sesión de Supabase (`session.accessToken` en supabase-swift) |

Sin credenciales válidas la respuesta es `401` con `{ "error": "<mensaje en español>" }`.

## Formato de errores

Todas las rutas devuelven errores como JSON:

```json
{ "error": "Mensaje genérico en español" }
```

- Nunca se exponen mensajes de error internos.
- `400` body inválido · `401` no autenticado · `402` requiere plan Básico ·
  `403` sin permiso de IA · `404` recurso no encontrado · `429` rate limit
  excedido · `500` error interno.
- Planes: `generate-program`, `chat` y `weekly-analysis` exigen plan de pago
  (`has_paid_plan()`); `generate-wod` permite 2 WODs por semana (lunes a
  domingo, hora de México) sin plan. Si no alcanza responden `402` con
  `code: "plan_required"`, antes de contar contra el rate limit.
- Las rutas que envían datos a Anthropic (`generate-wod`, `generate-program`,
  `chat`, `weekly-analysis`) exigen `profiles.ai_consent_at`. Sin él responden
  `403` con `code: "ai_consent_required"`, antes de contar contra el rate limit.
  El cliente debe pedir el permiso (App Store 5.1.2(i)) y guardarlo con un
  update de `profiles.ai_consent_at`; `null` lo retira.
- El `429` incluye además `remaining: 0` y `limit: <n>` en el body.

## Rate limiting

Límites diarios por usuario (ventana móvil de 24 h, ver `src/lib/rate-limit.ts`).
Los usuarios con rol `admin` no tienen límite.

| Acción | Rutas | Límite/día |
|---|---|---|
| `generate_wod` | `POST /api/generate-wod` | 5 |
| `generate_program` | `POST /api/generate-program` | 2 |
| `weekly_analysis` | `GET /api/weekly-analysis` (solo al regenerar, ver caché) | 5 |
| `chat` | `POST /api/chat` | 20 |
| `assessment` | `POST /api/assessments`, `POST /api/assessments/{id}/complete` | 10 |

Las respuestas exitosas de rutas con rate limit incluyen:

```
X-RateLimit-Limit: <límite diario>
X-RateLimit-Remaining: <peticiones restantes tras esta>
```

El `429` incluye los mismos headers con `Remaining: 0`. El chat además envía
`X-Chat-Remaining` (legado, mismo valor que `X-RateLimit-Remaining`).

---

## Endpoints

### POST /api/generate-wod

Genera un WOD personalizado usando el perfil, los últimos 28 días de
feedback/WODs, el programa activo y los PRs del usuario.

**Body** (opcional):

```json
{ "sessionNotes": "string, máx. 1000 caracteres" }
```

**200** → objeto `Wod`:

```json
{
  "title": "string",
  "warmUp":        { "title": "...", "duration": "...", "parts": ["..."] },
  "strengthSkill": { "title": "...", "details": ["..."] },
  "metcon":        { "title": "...", "type": "AMRAP|EMOM|For Time|Tabata", "description": "...", "movements": ["..."] },
  "coolDown":      { "title": "...", "parts": ["..."] }
}
```

**Errores propios**: `400` si el usuario no tiene perfil (onboarding incompleto),
`503` si el servicio de IA está saturado.

**Streaming (opcional)**: con el header `Accept: application/x-ndjson` la
respuesta es `200` con una línea JSON por evento, para mostrar el WOD conforme
se genera (el primer contenido llega en ~10 s; el WOD completo, en ~25 s):

```
{"type":"status","stage":"thinking"}
{"type":"partial","wod":{ "title": "...", "warmUp": { ... } }}   ← se repite; cualquier campo puede faltar
{"type":"done","wod":{ ...Wod completo y validado... }}
```

Si algo falla después de empezar, el último evento es
`{"type":"error","error":"<mensaje en español>"}` (el status HTTP ya fue 200).
Auth, rate limit y errores de validación siguen respondiendo con su status
normal antes de abrir el stream. El uso cuenta contra el límite solo al llegar
a `done`.

> El cliente decide si guarda el WOD (insert en `wods` vía Supabase).

### POST /api/generate-program

Genera un mesociclo de 4 semanas y lo persiste (upsert en `training_programs`
por usuario y mes). Sin body. Generar reinicia el avance: `started_at` = ahora,
`session_offset` = 0, `resume_ack_at` = null.

El avance no depende del calendario: la sesión que toca se calcula con los
resultados registrados en `workout_feedback` desde `started_at`, menos
`session_offset` (ver `src/lib/program-progress.ts`). El programa activo es el
de `started_at` más reciente. Tras 7 días o más sin registrar resultados, la app
pregunta cómo retomar: seguir (`resume_ack_at` = ahora), repetir la semana
(`session_offset` += sesiones hechas en la semana) o generar uno nuevo.

**200**:

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "month": 6,
  "year": 2026,
  "weeks": [ { "number": 1, "focus": "...", "skillFocus": "...", "sessions": [ { "order": 1, "type": "...", "emphasis": "...", "intensity": "moderada" } ] } ],
  "created_at": "ISO 8601",
  "started_at": "ISO 8601",
  "session_offset": 0,
  "resume_ack_at": null
}
```

### GET /api/weekly-analysis

Resumen de rendimiento de la semana en curso generado con IA a partir del
feedback registrado.

**200**:

```json
{
  "feedbackCount": 3,
  "analysis": {
    "resumen_semanal": "...",
    "logros": ["..."],
    "tendencias": ["..."],
    "areas_atencion": ["..."],
    "recomendaciones_proxima_semana": ["..."],
    "carga_percibida": "...",
    "nota_motivacional": "..."
  }
}
```

`analysis` es `null` si no hay feedback esta semana (`feedbackCount: 0`) o si
la generación falló.

**Caché**: el análisis se guarda por usuario y semana (tabla
`weekly_analyses`, semana que inicia en lunes). Mientras el número de feedbacks
de la semana no cambie, la ruta devuelve el análisis guardado sin llamar a la
IA. Las respuestas desde caché **no consumen** el rate limit ni incluyen los
headers `X-RateLimit-*`; solo se cuenta (y puede devolver `429`) cuando hay
que regenerar porque no hay caché o llegó feedback nuevo. Sin feedback esta
semana tampoco se consume el límite.

### GET /api/training-intelligence

Insights de periodización calculados en el servidor (sin IA) sobre los
últimos 28 días. Sin rate limit.

**200**: ver `TrainingIntelligenceResponse` en
`src/app/api/training-intelligence/route.ts` (`hasEnoughData`, `totalWods`,
`summary` con dominio dominante, sugerencia de fuerza, aviso de deload, etc.).

### POST /api/chat

Coach IA conversacional ("Brasa"). **Respuesta streaming** de texto plano
(`Content-Type: text/plain; charset=utf-8`), no JSON — leer el body como
stream incremental.

**Body**:

```json
{
  "message": "string, 1–2000 caracteres (requerido)",
  "history": [ { "role": "user|assistant", "content": "string ≤4000" } ],
  "context": { "wod": { } }
}
```

- `history`: máx. 20 entradas (el servidor usa las últimas 6).
- `context.wod`: el `Wod` actualmente visible, opcional.

**200**: stream de texto. **Errores**: `503` si el modelo de IA está saturado
(reintentar), `500` genérico.

### GET /api/assessments

Lista las evaluaciones de nivel del usuario (más recientes primero).

**200**: `LevelAssessment[]` — `{ id, user_id, from_level, to_level, benchmark_id, status: "pending|passed|failed", self_report, created_at, completed_at }`

### POST /api/assessments

Inicia una evaluación de nivel. El benchmark debe corresponder al nivel
actual del perfil.

**Body**: `{ "benchmarkId": "string" }`

**200**: el `LevelAssessment` creado (status `pending`).
**Errores propios**: `400` benchmark inválido para el nivel actual o perfil inexistente.

### POST /api/assessments/{id}/complete

Registra el resultado de una evaluación pendiente y, si se aprueba,
sube el `experience_level` del perfil.

**Body**:

```json
{
  "selfReport": {
    "completed": true,
    "total_time_minutes": 5,
    "rounds_or_reps": "string ≤100",
    "rx_or_scaled": "Rx|Scaled",
    "notes": "string ≤500"
  }
}
```

`completed` y `rx_or_scaled` son requeridos; el resto opcional/null.

**200**: `{ "assessment": LevelAssessment, "levelChanged": boolean }`
**Errores propios**: `404` evaluación inexistente o de otro usuario, `400` ya completada.

---

### DELETE /api/account

Elimina la cuenta del usuario autenticado y todos sus datos (requisito de App
Store 5.1.1(v)). Llama a la función `delete_own_account()`, que borra la fila
de `auth.users`; todas las tablas de `public` caen en cascada. Sin rate limit.

**Body**: `{ "confirm": "ELIMINAR" }` (cualquier otro valor → 400).

**200**: `{ "deleted": true }`. Con cookie, la respuesta también limpia la
sesión; un cliente nativo debe descartar sus tokens.

### POST /api/billing/checkout

Body `{ "price": "basico_mensual" | "basico_anual" | "fundador_anual" }`.
Devuelve `{ "url" }` de Stripe Checkout. La primera suscripción trae 7 días de
prueba. `409` si ya hay plan activo; `403` si el precio Fundador ya no aplica
(`fundador_eligible()`: registrados antes del 22 de octubre de 2026 o dentro de
los primeros 100 suscriptores).

### POST /api/billing/portal

Devuelve `{ "url" }` del portal de Stripe (cambiar entre mensual y anual,
método de pago, facturas, cancelar al final del periodo). `404` sin suscripción.

### POST /api/stripe/webhook

Lo llama Stripe, firmado con `STRIPE_WEBHOOK_SECRET`. Sincroniza
`checkout.session.completed` y `customer.subscription.*` en `subscriptions`
(una fila por usuario; el usuario sólo puede leer la suya). Eliminar la cuenta
cancela antes la suscripción de Stripe.

### POST /api/cron/push-reminders

Recordatorio push "hoy no has entrenado". No lo llama el cliente: pg_cron lo
dispara cada hora (job `push-reminders`, Vercel Hobby sólo permite un cron
diario) con `Authorization: Bearer <CRON_SECRET>`; sin ese header → `401`.

Lee `due_push_reminders()` (service role): suscripciones cuya hora local es
`reminder_hour`, sin resultado registrado hoy en su zona y sin aviso enviado
hoy. A lo más un aviso al día por suscripción. Envía con `web-push`, marca `last_sent_on` y
borra las suscripciones que el servicio de push da por vencidas (404/410).

**200**: `{ "due": n, "sent": n, "expired": n }`.

Los clientes guardan su suscripción directo en `push_subscriptions` (RLS por
usuario) con `endpoint`, `p256dh`, `auth`, `timezone` (IANA) y `reminder_hour`
(0-23). `platform: "apns"` queda reservado para la app de iOS.

## Datos de sesión para HealthKit

`workout_feedback` (escrito vía Supabase directo) incluye desde la Fase 2:

| Columna | Tipo | Contenido |
|---|---|---|
| `started_at` | timestamptz | Inicio real del entrenamiento (live mode) |
| `ended_at` | timestamptz | Fin real, derivado de la duración medida |
| `section_times` | jsonb | `{ "warmUp": seg, "strengthSkill": seg, "metcon": seg, "coolDown": seg }` |

Las tres son `null` cuando el resultado se registró sin live mode. Para
HealthKit: `HKWorkout` de tipo `.functionalStrengthTraining` con
`startDate = started_at`, `endDate = ended_at`.
