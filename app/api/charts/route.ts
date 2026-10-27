import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const semana = await prisma.chartEntry.findMany({
      where: { period: 'semana', isPublished: true },
      orderBy: { position: 'asc' },
      include: {
        artist: { select: { name: true, slug: true, avatarUrl: true } },
        music: { select: { title: true, slug: true } },
      },
    });

    const ano = await prisma.chartEntry.findMany({
      where: { period: 'ano', isPublished: true },
      orderBy: { position: 'asc' },
      include: {
        artist: { select: { name: true, slug: true, avatarUrl: true } },
        music: { select: { title: true, slug: true } },
      },
    });

    return NextResponse.json({
      semana,
      ano,
    });
  } catch (error) {
    console.error('Erro ao buscar rankings /api/charts:', error);
    return NextResponse.json({ error: 'Erro interno ao buscar rankings' }, { status: 500 });
  }
}
