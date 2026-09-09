import type { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/users');
}

export async function POST(request: NextRequest) {
  return proxyToBackend(request, '/users');
}

export const dynamic = 'force-dynamic';
