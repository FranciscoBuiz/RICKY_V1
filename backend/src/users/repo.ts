import { prisma, type Role, type UserStatus } from '../db/prisma.js';
import { ETIQUETA_POR_ROL } from './roles.js';

/** Exactamente la forma que declara `frontend/src/types/index.ts`. */
export interface PanelUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'pending';
}

interface FilaUsuario {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

export function toPanelUser(fila: FilaUsuario): PanelUser {
  return {
    id: fila.id,
    name: fila.name,
    email: fila.email,
    role: ETIQUETA_POR_ROL[fila.role as Role],
    status: (fila.status as UserStatus) === 'ACTIVE' ? 'active' : 'pending',
  };
}

export async function listUsers(): Promise<PanelUser[]> {
  const filas = await prisma.user.findMany({ orderBy: { invitedAt: 'asc' } });
  return filas.map(toPanelUser);
}

export async function findByEmail(email: string) {
  return prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
}

export async function inviteUser(email: string, role: Role): Promise<PanelUser> {
  const normalizado = email.trim().toLowerCase();
  const fila = await prisma.user.create({
    data: {
      email: normalizado,
      name: normalizado.split('@')[0] ?? normalizado,
      role,
      status: 'PENDING',
    },
  });
  return toPanelUser(fila);
}
