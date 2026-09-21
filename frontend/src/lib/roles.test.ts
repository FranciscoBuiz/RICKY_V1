import { describe, expect, it } from 'vitest';
import { puede } from '@/lib/roles';
import type { UserRole } from '@/types';

/*
 * La matriz de PRODUCT.md, escrita como test: los tres roles existen en la UI
 * desde que hay invitaciones, pero hasta acá ninguna ruta los miraba. Si alguien
 * afloja un permiso, esta tabla lo dice antes que el panel.
 */
const MATRIZ: [UserRole, { leer: boolean; escribir: boolean; administrar: boolean }][] = [
  ['Administrador', { leer: true, escribir: true, administrar: true }],
  ['Editor', { leer: true, escribir: true, administrar: false }],
  ['Solo lectura', { leer: true, escribir: false, administrar: false }],
];

describe('puede', () => {
  for (const [rol, esperado] of MATRIZ) {
    it(`${rol}: leer=${esperado.leer} escribir=${esperado.escribir} administrar=${esperado.administrar}`, () => {
      expect(puede(rol, 'leer')).toBe(esperado.leer);
      expect(puede(rol, 'escribir')).toBe(esperado.escribir);
      expect(puede(rol, 'administrar')).toBe(esperado.administrar);
    });
  }
});
