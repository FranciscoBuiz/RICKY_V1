import { describe, expect, it } from 'vitest';
import type { Vehicle } from '@/types';

/* Es un test de tipos tanto como de valores: si `images` o `'Moto'` no existen,
   no compila, y `npm run typecheck` lo marca antes de que corra el runner. */
describe('modelo Vehicle', () => {
  it('acepta una moto 0 km sin motor, tracción, puertas ni descripción', () => {
    const moto: Vehicle = {
      id: 'pcx26',
      brand: 'Honda',
      model: 'PCX',
      version: 'Deluxe',
      year: 2026,
      mileage: 0,
      fuel: 'Nafta',
      transmission: 'Automática',
      bodyType: 'Moto',
      price: 7500,
      status: 'available',
      featured: false,
      color: 'Azul',
      location: 'Mar del Plata',
      purchasePrice: 0,
      expenses: 0,
      images: [{ src: '/vehiculos/pcx26/01.jpg', alt: 'Honda PCX Deluxe 0 km azul' }],
    };

    expect(moto.engine).toBeUndefined();
    expect(moto.images).toHaveLength(1);
  });

  it('acepta Nafta/GNC como combustible', () => {
    const combustible: Vehicle['fuel'] = 'Nafta/GNC';
    expect(combustible).toBe('Nafta/GNC');
  });
});
