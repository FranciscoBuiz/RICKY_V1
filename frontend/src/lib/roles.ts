import type { UserRole } from '@/types';

/**
 * Qué puede hacer cada rol. Función pura y sin dependencias del borde HTTP a
 * propósito: la regla se testea sola, y los handlers la componen con
 * `getSession`, que sigue siendo la única costura que los tests mockean.
 *
 * - `leer`: todo lo que el panel muestra.
 * - `escribir`: stock, estados de consultas y de turnos.
 * - `administrar`: configuración de la agencia, notificaciones y usuarios.
 */
export type Accion = 'leer' | 'escribir' | 'administrar';

const PERMISOS: Record<UserRole, Accion[]> = {
  Administrador: ['leer', 'escribir', 'administrar'],
  Editor: ['leer', 'escribir'],
  'Solo lectura': ['leer'],
};

export function puede(rol: UserRole, accion: Accion): boolean {
  return PERMISOS[rol].includes(accion);
}
