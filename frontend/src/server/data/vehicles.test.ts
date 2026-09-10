import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { seedVehicles } from '@/server/data/vehicles';

const FOTOS_POR_ID: Record<string, number> = {
  etios17: 10,
  hilux18: 9,
  palio15: 8,
  fox17: 7,
  etios16: 6,
  pcx26: 5,
};

describe('seedVehicles', () => {
  it('tiene los seis vehículos reales, con los ids que ya circularon por WhatsApp', () => {
    expect(seedVehicles.map((v) => v.id).sort()).toEqual(
      ['etios16', 'etios17', 'fox17', 'hilux18', 'palio15', 'pcx26'].sort(),
    );
  });

  it('le da a cada vehículo la cantidad de fotos que tiene en disco', () => {
    for (const vehiculo of seedVehicles) {
      expect(vehiculo.images).toHaveLength(FOTOS_POR_ID[vehiculo.id]);
    }
  });

  it('apunta a archivos que existen', () => {
    for (const vehiculo of seedVehicles) {
      for (const foto of vehiculo.images) {
        const ruta = path.join(process.cwd(), 'public', foto.src);
        expect(existsSync(ruta), `falta ${foto.src}`).toBe(true);
      }
    }
  });

  it('deja los costos internos en cero: no los tenemos y no se inventan', () => {
    for (const vehiculo of seedVehicles) {
      expect(vehiculo.purchasePrice).toBe(0);
      expect(vehiculo.expenses).toBe(0);
    }
  });

  it('no marca ningún vehículo real como reservado ni vendido', () => {
    for (const vehiculo of seedVehicles) {
      expect(vehiculo.status).toBe('available');
    }
  });

  it('destaca solo el Etios 2017, como el catálogo original', () => {
    expect(seedVehicles.filter((v) => v.featured).map((v) => v.id)).toEqual(['etios17']);
  });
});
