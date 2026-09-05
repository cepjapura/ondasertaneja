import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  try {
    const city = await prisma.city.findUnique({
      where: { slug },
      include: {
        venues: true,
        events: {
          include: {
            venue: true,
            artists: { include: { artist: true } },
          },
          orderBy: { eventDate: 'asc' },
        },
        news: {
          include: { news: true },
        },
      },
    });

    if (!city) {
      return NextResponse.json({ error: 'Cidade não encontrada' }, { status: 404 });
    }

    return NextResponse.json(city);
  } catch (error) {
    console.error('Erro ao buscar dados da cidade:', error);
    return NextResponse.json({ error: 'Erro ao buscar cidade' }, { status: 500 });
  }
}
