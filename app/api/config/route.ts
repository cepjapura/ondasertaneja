import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [configs, publishedWeekly] = await Promise.all([
      prisma.systemConfig.findMany(),
      prisma.weeklyPlaylist.findFirst({
        where: { status: 'PUBLISHED' },
        orderBy: { publishedAt: 'desc' },
        include: {
          items: {
            where: { isRemoved: false },
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
    ]);

    const configMap: Record<string, string> = {};
    configs.forEach((c) => {
      configMap[c.key] = c.value;
    });

    // Prioridade no player: Playlist semanal PUBLISHED > link manual das Configurações
    if (publishedWeekly && publishedWeekly.items.length > 0) {
      const firstId = publishedWeekly.items[0].youtubeVideoId;
      const restIds = publishedWeekly.items.slice(1).map((i) => i.youtubeVideoId).join(',');
      configMap.playlistEmbedUrl = restIds
        ? `https://www.youtube-nocookie.com/embed/${firstId}?playlist=${restIds}&autoplay=1`
        : `https://www.youtube-nocookie.com/embed/${firstId}?autoplay=1`;
      configMap.playlistTitle = `Lançamentos da Semana (${publishedWeekly.items.length} músicas)`;
      configMap.isWeeklyPlaylist = 'true';
    }

    return NextResponse.json(configMap, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    return NextResponse.json({ error: 'Erro ao carregar configurações' }, { status: 500 });
  }
}
