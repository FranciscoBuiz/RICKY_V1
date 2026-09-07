import { prisma } from '../src/db/prisma.js';

/**
 * TRUNCATE en vez de recrear el esquema: recrearlo en cada test hace que la
 * suite tarde minutos. CASCADE se lleva las sesiones por la clave foránea.
 */
export async function limpiarBase(): Promise<void> {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Session", "User" RESTART IDENTITY CASCADE');
}
