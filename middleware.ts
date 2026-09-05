import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
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

  return NextResponse.next();
}

export const config = {
  matcher: ['/artista.html', '/noticia.html'],
};
