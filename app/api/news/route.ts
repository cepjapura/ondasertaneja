import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const featuredOnly = searchParams.get('featured') === 'true';
  const category = searchParams.get('category');

  try {
    const where: any = {};
    if (featuredOnly) where.isFeatured = true;
    if (category) where.category = category;

    const newsList = await prisma.news.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      include: {
        artists: { include: { artist: { select: { name: true, slug: true } } } },
      },
    });

    return NextResponse.json(newsList);
  } catch (error) {
    console.error('Erro ao listar notícias:', error);
    return NextResponse.json({ error: 'Erro ao listar notícias' }, { status: 500 });
  }
}
