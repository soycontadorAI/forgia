// Utilidades para armar prompts con texto que viene del usuario.

/**
 * Limpia texto libre del usuario antes de meterlo a un prompt: lo recorta y
 * quita los caracteres con los que podría cerrar una etiqueta o un bloque.
 */
export function sanitizeUserText(text: string | null | undefined, maxLength = 500): string {
  if (!text) return '';
  return text.trim().slice(0, maxLength).replace(/[<>{}]/g, '');
}

/** Envuelve contenido en una etiqueta XML; devuelve '' si no hay contenido. */
export function xmlBlock(tag: string, content: string | null | undefined): string {
  if (!content?.trim()) return '';
  return `<${tag}>\n${content.trim()}\n</${tag}>`;
}
