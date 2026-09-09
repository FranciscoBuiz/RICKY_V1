import type { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

type Contexto = { params: Promise<{ path: string[] }> };

async function reenviar(request: NextRequest, contexto: Contexto) {
  const { path } = await contexto.params;
  return proxyToBackend(request, `/auth/${path.join('/')}`);
}

export const GET = reenviar;
export const POST = reenviar;

export const dynamic = 'force-dynamic';
