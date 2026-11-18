import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPlaylistEmbedUrl, getSimpleHash } from '@/lib/playlist';

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
      const ids = publishedWeekly.items.map((i) => i.youtubeVideoId);
      const firstId = ids[0];
      const restIds = ids.slice(1).join(',');
      configMap.playlistEmbedUrl = restIds
        ? `https://www.youtube-nocookie.com/embed/${firstId}?playlist=${restIds}&enablejsapi=1`
        : `https://www.youtube-nocookie.com/embed/${firstId}?enablejsapi=1`;
      configMap.playlistTitle = `Lançamentos da Semana (${publishedWeekly.items.length} músicas)`;
      configMap.isWeeklyPlaylist = 'true';
      configMap.playlistKey = publishedWeekly.weekIdentifier;
      configMap.playlistVideoIds = JSON.stringify(ids);
    } else {
      const manualUrl = configMap.playlistUrl || configMap.wavePlaylistUrl || '';
      if (manualUrl) {
        let embed =
          configMap.playlistEmbedUrl ||
          (configMap.playlistUrl ? getPlaylistEmbedUrl(configMap.playlistUrl) : null) ||
          (configMap.wavePlaylistUrl ? getPlaylistEmbedUrl(configMap.wavePlaylistUrl) : null);
        if (embed && !embed.includes('enablejsapi=1')) {
          embed += (embed.includes('?') ? '&' : '?') + 'enablejsapi=1';
        }
        configMap.playlistEmbedUrl = embed || '';
        const listMatch = manualUrl.match(/[?&]list=([a-zA-Z0-9_-]+)/i);
        if (listMatch) {
          configMap.playlistListId = listMatch[1];
          configMap.playlistKey = `manual-${listMatch[1]}`;
        } else {
          configMap.playlistKey = getSimpleHash(manualUrl);
        }
      }
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
