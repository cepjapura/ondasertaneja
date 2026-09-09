import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() || '';

  if (!q || q.length < 2) {
    return NextResponse.json({
      query: q,
      artists: [],
      events: [],
      cities: [],
      news: [],
      musics: [],
    });
  }

  try {
    const term = `%${q}%`;

    // 1. Artistas
    const artists = await prisma.artist.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { slug: { contains: q } },
        ],
      },
      take: 4,
      orderBy: [
        { isFeatured: 'desc' },
        { name: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        slug: true,
        avatarUrl: true,
        isFeatured: true,
      },
    });

    // 2. Events / Shows
    const events = await prisma.event.findMany({
      where: {
        OR: [
          { title: { contains: q } },
          { slug: { contains: q } },
        ],
      },
      take: 4,
      orderBy: [
        { isHighlight: 'desc' },
        { eventDate: 'asc' },
      ],
      include: {
        city: { select: { name: true, stateCode: true, slug: true } },
        venue: { select: { name: true } },
      },
    });

    // 3. Cidades
    const cities = await prisma.city.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { stateCode: { contains: q } },
          { slug: { contains: q } },
        ],
      },
      take: 3,
      select: {
        id: true,
        name: true,
        stateCode: true,
        slug: true,
      },
    });

    // 4. Notícias
    const news = await prisma.news.findMany({
      where: {
        OR: [
          { title: { contains: q } },
          { summary: { contains: q } },
        ],
      },
      take: 3,
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        coverUrl: true,
        trustType: true,
        publishedAt: true,
      },
    });

    // 5. Músicas
    const musics = await prisma.music.findMany({
      where: {
        title: { contains: q },
      },
      take: 4,
      include: {
        album: { select: { coverUrl: true } },
        artists: {
          include: { artist: { select: { name: true, slug: true, avatarUrl: true } } },
        },
      },
    });

    return NextResponse.json({
      query: q,
      artists,
      events,
      cities,
      news,
      musics,
    });
  } catch (error) {
    console.error('Erro na API de busca preditiva:', error);
    return NextResponse.json({ error: 'Erro ao realizar busca' }, { status: 500 });
  }
}
