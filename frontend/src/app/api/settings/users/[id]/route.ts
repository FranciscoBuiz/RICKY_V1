import type { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

type Contexto = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, contexto: Contexto) {
  const { id } = await contexto.params;
  return proxyToBackend(request, `/users/${id}`);
}

export async function DELETE(request: NextRequest, contexto: Contexto) {
  const { id } = await contexto.params;
  return proxyToBackend(request, `/users/${id}`);
}

export const dynamic = 'force-dynamic';
