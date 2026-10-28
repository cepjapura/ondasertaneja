import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, AdminSessionData } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // 1. Redirecionamento 301 de URLs legadas de artista (ex: /artista.html?nome=Ana%20Castela)
  if (pathname === '/artista.html') {
    const nomeParam = searchParams.get('nome');
    if (nomeParam) {
      const slug = nomeParam
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');

      const redirectUrl = new URL(`/artista/${slug}`, request.url);
      return NextResponse.redirect(redirectUrl, { status: 301 });
    }
  }

  // 2. Redirecionamento 301 de notícias legadas por ID se necessário
  if (pathname === '/noticia.html') {
    const idParam = searchParams.get('id');
    if (idParam) {
      const slug = idParam
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');

      const redirectUrl = new URL(`/noticia.html?id=${slug}`, request.url);
      return NextResponse.next();
    }
  }

  // 3. Proteção de Rotas Administrativas (/admin e /api/admin)
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const response = NextResponse.next();

    // Cabeçalhos de segurança contra indexação e cache de áreas administrativas
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

    // Validação de CSRF/Origin em rotas de API do admin (se houver)
    if (pathname.startsWith('/api/admin')) {
      const origin = request.headers.get('origin');
      const host = request.headers.get('host');
      if (origin && host && !origin.includes(host)) {
        return NextResponse.json({ error: 'Origem da requisição não autorizada.' }, { status: 403 });
      }
    }

    // A página de login (/admin/login) é acessível publicamente
    if (pathname === '/admin/login') {
      const session = await getIronSession<AdminSessionData>(request, response, sessionOptions);
      if (session.isLoggedIn && session.userId) {
        return NextResponse.redirect(new URL('/admin/videos', request.url));
      }
      return response;
    }

    // Para todas as demais rotas administrativas, exige sessão válida
    const session = await getIronSession<AdminSessionData>(request, response, sessionOptions);
    if (!session.isLoggedIn || !session.userId) {
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
      }
      const loginUrl = new URL('/admin/login', request.url);
      if (pathname !== '/admin') {
        loginUrl.searchParams.set('next', pathname);
      }
      return NextResponse.redirect(loginUrl);
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/artista.html', '/noticia.html', '/admin/:path*', '/api/admin/:path*'],
};
