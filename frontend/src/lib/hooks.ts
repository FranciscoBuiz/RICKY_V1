'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

/**
 * Replica el `width < N` del prototipo. Arranca en `false` (escritorio, igual
 * que el ancho por defecto de 1200px del original) para que servidor y cliente
 * rindan lo mismo, y se corrige apenas monta.
 */
export function useIsNarrow(maxWidth: number): boolean {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${maxWidth - 1}px)`);
    const sync = () => setNarrow(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, [maxWidth]);

  return narrow;
}

/** `true` cuando la página se desplazó más de `offset` píxeles. */
export function useScrolled(offset = 40): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > offset);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [offset]);

  return scrolled;
}

/** Suscribe un handler de teclado global mientras el componente está montado. */
export function useKeydown(handler: (event: KeyboardEvent) => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const listener = (event: KeyboardEvent) => handler(event);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [handler, enabled]);
}

/**
 * Paso de un wizard sincronizado con `?paso=N`.
 *
 * Antes el paso era estado local, así que el gesto de volver del navegador
 * salía del sitio y se llevaba todo lo tipeado. Con el paso en la URL, Back
 * significa "paso anterior", y el estado sobrevive a recargar y compartir.
 *
 * Requiere que el componente esté dentro de un `<Suspense>` (lo pide
 * `useSearchParams`).
 */
export function useWizardStep(max: number): [number, (next: number) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const parsed = Number.parseInt(params.get('paso') ?? '1', 10);
  const step = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), max) : 1;

  const setStep = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(next, 1), max);
      const query = new URLSearchParams(params.toString());
      if (clamped === 1) query.delete('paso');
      else query.set('paso', String(clamped));

      const qs = query.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [router, pathname, params, max],
  );

  return [step, setStep];
}
