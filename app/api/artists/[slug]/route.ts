import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  try {
    const artist = await prisma.artist.findUnique({
      where: { slug },
      include: {
        members: true,
        events: {
          include: {
            event: {
              include: {
                city: true,
                venue: true,
              },
            },
          },
          orderBy: { event: { eventDate: 'asc' } },
        },
        musics: {
          include: {
            music: {
              include: { album: true },
            },
          },
        },
        news: {
          include: { news: true },
          take: 5,
        },
        relationsAsArtistA: {
          include: { artistB: true },
        },
      },
    });

    if (!artist) {
      return NextResponse.json({ error: 'Artista não encontrado' }, { status: 404 });
    }

    // Se não houver relações manuais, buscar fallback por mesmo estilo
    let relatedArtists = artist.relationsAsArtistA.map(r => r.artistB);
    if (relatedArtists.length === 0) {
      relatedArtists = await prisma.artist.findMany({
        where: {
          id: { not: artist.id },
          genreTags: { contains: artist.genreTags || 'Sertanejo' },
        },
        take: 4,
      });
    }

    return NextResponse.json({
      ...artist,
      relatedArtists,
    });
  } catch (error) {
    console.error('Erro ao buscar artista por slug:', error);
    return NextResponse.json({ error: 'Erro ao buscar perfil do artista' }, { status: 500 });
  }
}
