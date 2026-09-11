import { money } from '@/lib/format';
import type { Vehicle } from '@/types';

/*
 * El cálculo del margen vive acá y no adentro de la vista porque es la única
 * regla de negocio nueva del panel de stock y necesita test propio: la vista es
 * un componente cliente y `tsconfig.json` fija `jsx: preserve` para Next, así
 * que el runner de tests no puede importar el `.tsx`.
 */

/** El margen sólo es "bueno" mientras dé positivo; en rojo cuando da pérdida. */
export function marginTone(value: number): string {
  return value < 0 ? 'var(--danger)' : 'var(--ok)';
}

/**
 * Sin precio de compra no hay margen que calcular. Antes esto daba el precio de
 * venta entero y se leía como una ganancia del 100 %: los seis vehículos reales
 * vienen con `purchasePrice` en 0 porque son costos que la agencia no nos pasó.
 */
export function margenVisible(vehicle: Vehicle): { texto: string; tono: string } {
  if (vehicle.purchasePrice === 0) {
    return { texto: 'sin cargar', tono: 'var(--muted)' };
  }
  const margen = vehicle.price - vehicle.purchasePrice - vehicle.expenses;
  return { texto: money(margen), tono: marginTone(margen) };
}
