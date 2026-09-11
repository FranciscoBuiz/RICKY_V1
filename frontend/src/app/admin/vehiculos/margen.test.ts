import { describe, expect, it } from 'vitest';
import { margenVisible } from '@/app/admin/vehiculos/margen';
import type { Vehicle } from '@/types';

/* `purchasePrice === 0` significa *sin cargar*, no *gratis*. Es la única regla
   de negocio nueva de la rama y es la que evita que el panel muestre el precio
   de venta entero como si fuera una ganancia del 100 %. Un refactor que
   "simplifique" el chequeo de cero la rompe en silencio: por eso el test. */
function vehiculo(patch: Partial<Vehicle>): Vehicle {
  return {
    id: 'x',
    brand: 'Toyota',
    model: 'Etios',
    version: 'XLS',
    year: 2017,
    mileage: 0,
    fuel: 'Nafta',
    transmission: 'Manual',
    bodyType: 'Sedán',
    price: 0,
    status: 'available',
    featured: false,
    color: '',
    location: 'Mar del Plata',
    images: [],
    purchasePrice: 0,
    expenses: 0,
    ...patch,
  };
}

describe('margenVisible', () => {
  it('dice "sin cargar" cuando no hay precio de compra', () => {
    expect(margenVisible(vehiculo({ price: 12000, purchasePrice: 0 })).texto).toBe('sin cargar');
  });

  it('resta compra y gastos cuando el costo está cargado', () => {
    const margen = margenVisible(vehiculo({ price: 12000, purchasePrice: 9000, expenses: 500 }));
    expect(margen.texto).toBe('US$ 2.500');
  });

  it('marca en rojo el margen negativo', () => {
    const margen = margenVisible(vehiculo({ price: 9000, purchasePrice: 9000, expenses: 500 }));
    expect(margen.tono).toBe('var(--danger)');
  });
});
