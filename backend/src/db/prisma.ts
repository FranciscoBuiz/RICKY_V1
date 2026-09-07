import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

export type Role = 'ADMIN' | 'EDITOR' | 'VIEWER';
export type UserStatus = 'PENDING' | 'ACTIVE';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    'Falta DATABASE_URL. ¿Importaste `load-env.js` antes que este módulo?',
  );
}

/**
 * Un solo cliente por proceso: cada `new PrismaClient()` abre su propio pool de
 * conexiones, y varios pools contra el mismo Postgres agotan los slots.
 *
 * Prisma 7 no trae motor propio: la conexión la abre el adapter sobre `pg`.
 */
export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
