import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { z } from 'zod';

// Modelo por ruta: Opus donde la calidad del plan importa, Sonnet para el chat
// (tono y latencia) y Haiku para resumir datos ya estructurados.
export const AI_MODELS = {
  wod: 'claude-opus-5-5',
  program: 'claude-opus-5-5',
  chat: 'claude-sonnet-5-5',
  weeklyAnalysis: 'claude-haiku-5-5',
} as const;

export type AIModel = (typeof AI_MODELS)[keyof typeof AI_MODELS];

// Si el modelo declina por política, el API reintenta del lado del servidor
// con el modelo que Anthropic recomienda para esa categoría. Haiku no tiene
// fallback del lado del servidor, así que no se le manda el parámetro.
function fallbackParams(model: AIModel) {
  if (model === 'claude-haiku-5-5') return {};
  return { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const };
}

export type AIEffort = 'low' | 'medium' | 'high';

let client: Anthropic | null = null;

export function isAIConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function getAnthropic(): Anthropic {
  if (!client) {
    // Reintenta 429, 5xx y errores de conexión con backoff (2 reintentos).
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 2 });
  }
  return client;
}

/** El modelo declinó la petición (stop_reason "refusal") o cortó la respuesta. */
export class AIIncompleteError extends Error {
  constructor(public readonly stopReason: string | null) {
    super(`Respuesta incompleta del modelo (stop_reason: ${stopReason})`);
    this.name = 'AIIncompleteError';
  }
}

/** Saturación o límite del proveedor que sigue fallando después de los reintentos. */
export function isTransientAIError(error: unknown): boolean {
  if (error instanceof Anthropic.RateLimitError) return true;
  if (error instanceof Anthropic.InternalServerError) return true; // incluye 529 overloaded
  if (error instanceof Anthropic.APIConnectionError) return true;
  return false;
}

export type SystemBlocks = Anthropic.Beta.Messages.BetaTextBlockParam[];

/**
 * Arma el system prompt como bloques, de lo estable a lo variable.
 * - 'each': un breakpoint de caché por bloque (prefijo compartido entre
 *   usuarios + contexto del usuario).
 * - 'last': solo el bloque final (se reutiliza al repetir la misma petición).
 * - 'none': sin caché, para prompts de una sola vez donde la escritura no se
 *   volvería a leer.
 */
export function systemBlocks(parts: string[], cache: 'each' | 'last' | 'none' = 'none'): SystemBlocks {
  const texts = parts.filter(Boolean);
  return texts.map((text, i) => {
    const cached = cache === 'each' || (cache === 'last' && i === texts.length - 1);
    return cached
      ? { type: 'text' as const, text, cache_control: { type: 'ephemeral' as const } }
      : { type: 'text' as const, text };
  });
}

/** Una línea JSON por llamada en los logs, para medir costo y aciertos de caché. */
function logUsage(route: string, model: string, usage: Anthropic.Beta.Messages.BetaUsage | undefined) {
  if (!usage) return;
  console.log(
    JSON.stringify({
      event: 'ai_usage',
      route,
      model,
      input: usage.input_tokens,
      output: usage.output_tokens,
      cache_read: usage.cache_read_input_tokens ?? 0,
      cache_write: usage.cache_creation_input_tokens ?? 0,
    })
  );
}

interface StructuredRequest<T extends z.ZodType> {
  route: string;
  model: AIModel;
  system: SystemBlocks;
  user: string;
  schema: T;
  effort: AIEffort;
  maxTokens?: number;
}

/** Genera JSON validado contra el esquema Zod (structured outputs). */
export async function generateStructured<T extends z.ZodType>({
  route,
  model,
  system,
  user,
  schema,
  effort,
  maxTokens = 16000,
}: StructuredRequest<T>): Promise<z.infer<T>> {
  const response = await getAnthropic().beta.messages.parse({
    model,
    max_tokens: maxTokens,
    ...fallbackParams(model),
    system,
    messages: [{ role: 'user', content: user }],
    output_config: { effort, format: betaZodOutputFormat(schema) },
  });
  logUsage(route, model, response.usage);

  if (response.stop_reason !== 'end_turn' || response.parsed_output == null) {
    throw new AIIncompleteError(response.stop_reason);
  }
  return response.parsed_output as z.infer<T>;
}

interface ChatStreamRequest {
  route: string;
  model: AIModel;
  system: SystemBlocks;
  messages: Anthropic.Beta.Messages.BetaMessageParam[];
  effort: AIEffort;
  maxTokens?: number;
}

/**
 * Abre un stream de texto. Espera la respuesta HTTP antes de devolver para que
 * los errores de conexión o de límite lleguen como excepción y la ruta pueda
 * responder con un status HTTP en lugar de un stream vacío.
 */
export async function openTextStream({
  route,
  model,
  system,
  messages,
  effort,
  maxTokens = 4000,
}: ChatStreamRequest): Promise<ReadableStream<Uint8Array>> {
  const stream = getAnthropic().beta.messages.stream({
    model,
    max_tokens: maxTokens,
    ...fallbackParams(model),
    // Caché automático del prefijo: system + historial previo de la conversación
    cache_control: { type: 'ephemeral' },
    system,
    messages,
    output_config: { effort },
  });

  const encoder = new TextEncoder();
  // Los listeners se registran antes de esperar la respuesta para no perder deltas.
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const close = () => {
        try {
          controller.close();
        } catch {
          // ya cerrado o cancelado por el cliente
        }
      };
      stream.on('text', (delta) => controller.enqueue(encoder.encode(delta)));
      stream.on('finalMessage', (message) => logUsage(route, model, message.usage));
      stream.on('end', close);
      stream.on('error', (error) => {
        console.error('Error durante el stream de IA:', error);
        close();
      });
    },
    cancel() {
      stream.abort();
    },
  });

  await stream.withResponse();
  return body;
}
