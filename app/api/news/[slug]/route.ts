import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  try {
    // Buscar primeiro por slug exato, ou por ID numérico (caso legado noticias.json?id=1)
    let article = await prisma.news.findUnique({
      where: { slug },
      include: {
        author: { select: { name: true, avatarUrl: true } },
        artists: { include: { artist: true } },
        events: { include: { event: { include: { city: true } } } },
        cities: { include: { city: true } },
      },
    });

    if (!article && /^\d+$/.test(slug)) {
      // Procura noticiario legado por ID
      const allNews = await prisma.news.findMany({ orderBy: { publishedAt: 'desc' } });
      const idx = parseInt(slug, 10) - 1;
      if (allNews[idx]) {
        article = await prisma.news.findUnique({
          where: { id: allNews[idx].id },
          include: {
            author: { select: { name: true, avatarUrl: true } },
            artists: { include: { artist: true } },
            events: { include: { event: { include: { city: true } } } },
            cities: { include: { city: true } },
          },
        });
      }
    }

    if (!article) {
      return NextResponse.json({ error: 'Notícia não encontrada' }, { status: 404 });
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error('Erro ao buscar matéria:', error);
    return NextResponse.json({ error: 'Erro ao buscar matéria' }, { status: 500 });
  }
}
