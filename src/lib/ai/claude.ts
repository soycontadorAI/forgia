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
 * Arma el system prompt como bloques: primero lo estable, al final lo
 * variable. `cache` marca el último bloque para prompt caching.
 */
export function systemBlocks(parts: string[], cache = false): SystemBlocks {
  const blocks: SystemBlocks = parts
    .filter(Boolean)
    .map((text) => ({ type: 'text' as const, text }));
  if (cache && blocks.length > 0) {
    blocks[blocks.length - 1] = { ...blocks[blocks.length - 1], cache_control: { type: 'ephemeral' } };
  }
  return blocks;
}

interface StructuredRequest<T extends z.ZodType> {
  model: AIModel;
  system: SystemBlocks;
  user: string;
  schema: T;
  effort: AIEffort;
  maxTokens?: number;
}

/** Genera JSON validado contra el esquema Zod (structured outputs). */
export async function generateStructured<T extends z.ZodType>({
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

  if (response.stop_reason !== 'end_turn' || response.parsed_output == null) {
    throw new AIIncompleteError(response.stop_reason);
  }
  return response.parsed_output as z.infer<T>;
}

interface ChatStreamRequest {
  model: AIModel;
  system: SystemBlocks;
  messages: Anthropic.Beta.Messages.BetaMessageParam[];
  effort: AIEffort;
  maxTokens?: number;
}

/**
 * Abre un stream de texto. Espera el primer evento antes de devolver para que
 * los errores de conexión o de límite lleguen como excepción y la ruta pueda
 * responder con un status HTTP en lugar de un stream vacío.
 */
export async function openTextStream({
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

  const iterator = stream[Symbol.asyncIterator]();
  const first = await iterator.next();
  const encoder = new TextEncoder();

  const textOf = (event: Anthropic.Beta.Messages.BetaRawMessageStreamEvent): string | null =>
    event.type === 'content_block_delta' && event.delta.type === 'text_delta' ? event.delta.text : null;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      if (!first.done) {
        const text = textOf(first.value);
        if (text) controller.enqueue(encoder.encode(text));
      }
    },
    async pull(controller) {
      try {
        const { value, done } = await iterator.next();
        if (done) {
          controller.close();
          return;
        }
        const text = textOf(value);
        if (text) controller.enqueue(encoder.encode(text));
      } catch (error) {
        console.error('Error durante el stream de IA:', error);
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });
}
