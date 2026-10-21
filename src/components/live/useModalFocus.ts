'use client';

import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/**
 * Manejo de foco para las pantallas completas del modo en vivo (no son un
 * <dialog> nativo porque viven encima de la app durante todo el entrenamiento):
 * - mueve el foco al contenedor al abrir y lo devuelve al cerrar
 * - mantiene Tab / Shift+Tab dentro del contenedor
 * - Escape llama a `onEscape`
 * Los <dialog> nativos anidados (ConfirmDialog) manejan su propio teclado.
 */
export function useModalFocus<T extends HTMLElement>(onEscape: () => void) {
  const ref = useRef<T>(null);
  const onEscapeRef = useRef(onEscape);

  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    root.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      // Un <dialog> modal abierto encima se encarga de su teclado
      if (target?.closest('dialog') || root.querySelector('dialog[open]')) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        onEscapeRef.current();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusables = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.closest('dialog') && el.getClientRects().length > 0
      );
      if (focusables.length === 0) {
        event.preventDefault();
        root.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (!root.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && (active === first || active === root)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  return ref;
}
