import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = 'motors_session';

/**
 * Solo evita el parpadeo de /admin antes del redirect. **No autoriza nada**: no
 * puede validar la sesión y no debe intentarlo. La decisión real es del backend,
 * que es el único que sabe si el token sirve.
 */
export function middleware(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ['/admin/:path*'] };
