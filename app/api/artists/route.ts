import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const featuredOnly = searchParams.get('featured') === 'true';

  try {
    const artists = await prisma.artist.findMany({
      where: featuredOnly ? { isFeatured: true } : undefined,
      orderBy: [
        { isFeatured: 'desc' },
        { name: 'asc' },
      ],
      include: {
        _count: {
          select: { events: true, musics: true },
        },
      },
    });

    return NextResponse.json(artists);
  } catch (error) {
    console.error('Erro ao listar artistas:', error);
    return NextResponse.json({ error: 'Erro ao listar artistas' }, { status: 500 });
  }
}
