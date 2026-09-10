import { describe, expect, it } from 'vitest';
import { money } from '@/lib/format';
import { PRICE_STEPS } from '@/lib/design';
import { seedVehicles } from '@/server/data/vehicles';

describe('money', () => {
  it('formatea en dólares, que es como publica la agencia', () => {
    expect(money(12900)).toBe('US$ 12.900');
  });

  it('formatea el vehículo más caro sin notación rara', () => {
    expect(money(38000)).toBe('US$ 38.000');
  });
});

describe('PRICE_STEPS', () => {
  it('deja al menos un vehículo bajo el escalón más bajo', () => {
    const masBarato = Math.min(...seedVehicles.map((v) => v.price));
    expect(masBarato).toBeLessThanOrEqual(PRICE_STEPS[0]);
  });

  it('deja todos los vehículos bajo el escalón más alto', () => {
    const masCaro = Math.max(...seedVehicles.map((v) => v.price));
    expect(masCaro).toBeLessThanOrEqual(PRICE_STEPS[PRICE_STEPS.length - 1]);
  });

  it('está ordenado de menor a mayor', () => {
    expect([...PRICE_STEPS].sort((a, b) => a - b)).toEqual([...PRICE_STEPS]);
  });

  it('el escalón más bajo particiona el catálogo real, no lo deja todo de un lado', () => {
    const precios = seedVehicles.map((v) => v.price);
    const escalonMasBajo = PRICE_STEPS[0];
    expect(precios.some((price) => price <= escalonMasBajo)).toBe(true);
    expect(precios.some((price) => price > escalonMasBajo)).toBe(true);
  });
});
