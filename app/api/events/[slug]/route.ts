import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  try {
    const event = await prisma.event.findUnique({
      where: { slug },
      include: {
        city: true,
        venue: true,
        source: true,
        artists: {
          include: { artist: true },
          orderBy: { performanceOrder: 'asc' },
        },
        news: {
          include: { news: true },
        },
        statusHistories: {
          include: { changedByUser: { select: { name: true } }, justificationSource: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error('Erro ao buscar evento:', error);
    return NextResponse.json({ error: 'Erro ao buscar evento' }, { status: 500 });
  }
}
