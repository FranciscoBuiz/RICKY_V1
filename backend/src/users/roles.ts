import type { Role } from '../db/prisma.js';

/** El frontend ya habla en etiquetas: la traducción vive en el borde HTTP. */
export const ETIQUETA_POR_ROL: Record<Role, string> = {
  ADMIN: 'Administrador',
  EDITOR: 'Editor',
  VIEWER: 'Solo lectura',
};

/** Lo que manda `/admin/configuracion` al invitar. */
export const ROL_POR_CLAVE: Record<string, Role> = {
  admin: 'ADMIN',
  editor: 'EDITOR',
  viewer: 'VIEWER',
};
