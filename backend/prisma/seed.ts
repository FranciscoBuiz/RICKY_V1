import '../src/load-env.js';
import { pathToFileURL } from 'node:url';
import { prisma, type Role } from '../src/db/prisma.js';

/**
 * Crea el primer administrador. Nadie puede invitarlo: el login es solo por
 * invitación, así que sin esto no entra nadie nunca.
 *
 * Queda PENDING a propósito. Pasa a ACTIVE en su primer login con Google, que
 * es también cuando se le fija el googleSub.
 */
export async function seedBootstrapAdmin(email: string): Promise<void> {
  const normalizado = email.trim().toLowerCase();

  await prisma.user.upsert({
    where: { email: normalizado },
    update: {},
    create: {
      email: normalizado,
      name: normalizado.split('@')[0] ?? normalizado,
      role: 'ADMIN',
      status: 'PENDING',
    },
  });
}

/**
 * Segundo usuario, invitado y sin estrenar. Existe para que el panel muestre el
 * estado PENDING además del ACTIVE del administrador: sin esto, la pantalla de
 * usuarios tiene una sola fila y no se ve cómo luce una invitación sin aceptar.
 */
export async function seedInvitedUser(email: string, role: Role): Promise<void> {
  const normalizado = email.trim().toLowerCase();

  await prisma.user.upsert({
    where: { email: normalizado },
    update: {},
    create: {
      email: normalizado,
      name: normalizado.split('@')[0] ?? normalizado,
      role,
      status: 'PENDING',
    },
  });
}

// Ejecutable directo: `tsx prisma/seed.ts`
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  if (!email) {
    console.error('Falta BOOTSTRAP_ADMIN_EMAIL en .env');
    process.exit(1);
  }

  await seedBootstrapAdmin(email);
  console.log(`Administrador inicial listo: ${email.toLowerCase()}`);

  const invitado = process.env.SEED_INVITED_EMAIL;
  if (invitado) {
    await seedInvitedUser(invitado, 'EDITOR');
    console.log(`Usuario invitado listo: ${invitado.toLowerCase()}`);
  }

  await prisma.$disconnect();
}
