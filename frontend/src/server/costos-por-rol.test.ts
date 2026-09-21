import { describe, expect, it } from 'vitest';
import { toPanelVehicle } from '@/server/store';
import type { Vehicle } from '@/types';

/* `purchasePrice` y `expenses` son costos internos. El catálogo público ya los
   recorta con `toPublicVehicle`; esto hace lo propio para el rol del panel que
   no tiene por qué verlos. La diferencia con el recorte público es que acá el
   campo tiene que estar *ausente*, no en cero: un cero significa "sin cargar" y
   diría algo falso sobre el vehículo. */
const VEHICULO: Vehicle = {
  id: 'v-1',
  brand: 'Toyota',
  model: 'Etios',
  version: 'XLS',
  year: 2017,
  mileage: 90000,
  fuel: 'Nafta',
  transmission: 'Manual',
  bodyType: 'Sedán',
  price: 12000,
  status: 'available',
  featured: false,
  color: 'Gris',
  location: 'Mar del Plata',
  images: [],
  purchasePrice: 9000,
  expenses: 500,
};

describe('toPanelVehicle', () => {
  it('le saca los costos a Solo lectura', () => {
    const vehiculo = toPanelVehicle(VEHICULO, 'Solo lectura');

    expect(vehiculo).not.toHaveProperty('purchasePrice');
    expect(vehiculo).not.toHaveProperty('expenses');
  });

  it('deja el resto del vehículo intacto para Solo lectura', () => {
    const vehiculo = toPanelVehicle(VEHICULO, 'Solo lectura');

    expect(vehiculo.price).toBe(12000);
    expect(vehiculo.brand).toBe('Toyota');
    expect(vehiculo.id).toBe('v-1');
  });

  it('le deja los costos a Editor y Administrador', () => {
    for (const rol of ['Editor', 'Administrador'] as const) {
      expect(toPanelVehicle(VEHICULO, rol)).toMatchObject({ purchasePrice: 9000, expenses: 500 });
    }
  });
});
