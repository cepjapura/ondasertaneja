import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const citySlug = searchParams.get('city')?.trim();
  const artistSlug = searchParams.get('artist')?.trim();
  const highlightOnly = searchParams.get('highlight') === 'true';

  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Se houver busca por cidade específica, aplica a cascata de localização V1.2
    if (citySlug) {
      const selectedCity = await prisma.city.findUnique({ where: { slug: citySlug } });

      // Nível 1: Cidade Selecionada
      const localEvents = await prisma.event.findMany({
        where: {
          cityId: selectedCity?.id,
          eventDate: { gte: now },
        },
        include: {
          city: true,
          venue: true,
          artists: { include: { artist: true } },
          source: true,
        },
        orderBy: { eventDate: 'asc' },
      });

      // Nível 2: Estado (se não for a mesma cidade)
      const stateEvents = selectedCity
        ? await prisma.event.findMany({
            where: {
              city: { stateCode: selectedCity.stateCode },
              cityId: { not: selectedCity.id },
              eventDate: { gte: now },
            },
            include: {
              city: true,
              venue: true,
              artists: { include: { artist: true } },
            },
            take: 6,
            orderBy: { eventDate: 'asc' },
          })
        : [];

      // Nível 3: Destaques Nacionais
      const nationalHighlights = await prisma.event.findMany({
        where: {
          isHighlight: true,
          eventDate: { gte: now },
        },
        include: {
          city: true,
          venue: true,
          artists: { include: { artist: true } },
        },
        take: 6,
        orderBy: { eventDate: 'asc' },
      });

      return NextResponse.json({
        selectedCity,
        cascade: {
          local: localEvents,
          state: stateEvents,
          national: nationalHighlights,
        },
      });
    }

    // Caso de listagem geral sem filtro de cidade
    const whereCondition: any = {
      eventDate: { gte: now },
    };

    if (highlightOnly) {
      whereCondition.isHighlight = true;
    }

    if (artistSlug) {
      whereCondition.artists = {
        some: { artist: { slug: artistSlug } },
      };
    }

    const events = await prisma.event.findMany({
      where: whereCondition,
      include: {
        city: true,
        venue: true,
        artists: { include: { artist: true } },
        source: true,
      },
      orderBy: { eventDate: 'asc' },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error('Erro ao listar eventos:', error);
    return NextResponse.json({ error: 'Erro ao listar agenda de eventos' }, { status: 500 });
  }
}
