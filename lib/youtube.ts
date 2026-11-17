import { cleanEnv } from './env';

export interface ChannelResolved {
  channelId: string;
  channelTitle: string;
  channelUrl: string;
  avatarUrl: string | null;
  uploadsPlaylistId: string;
}

export interface VideoCandidate {
  videoId: string;
  title: string;
  channelTitle: string;
  channelId: string;
  thumbnailUrl: string | null;
  durationSeconds: number;
  publishedAt: Date;
}

/**
 * Converte duração ISO 8601 (ex.: PT3M45S, PT1H2M30S, PT45S) em segundos.
 */
export function parseIsoDuration(durationStr: string): number {
  if (!durationStr || typeof durationStr !== 'string') return 0;
  const match = durationStr.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Extrai dimensões (width e height) do HTML de player do YouTube (part=player).
 * Se embedHeight > embedWidth, o vídeo é estritamente vertical (Shorts).
 */
export function isVerticalVideo(embedHtml?: string): boolean {
  if (!embedHtml) return false;
  const widthMatch = embedHtml.match(/width="(\d+)"/i);
  const heightMatch = embedHtml.match(/height="(\d+)"/i);
  if (widthMatch && heightMatch) {
    const w = parseInt(widthMatch[1], 10);
    const h = parseInt(heightMatch[1], 10);
    if (!isNaN(w) && !isNaN(h) && h > w) {
      return true;
    }
  }
  return false;
}

function getApiKey(): string {
  const key = cleanEnv(process.env.YOUTUBE_API_KEY);
  if (!key) {
    throw new Error('Chave da API do YouTube não configurada. Defina a variável YOUTUBE_API_KEY.');
  }
  return key;
}

/**
 * Resolve qualquer formato de link/handle do canal do YouTube para obter channelId oficial.
 */
export async function resolveChannel(inputUrlOrHandle: string): Promise<ChannelResolved> {
  const apiKey = getApiKey();
  let trimmed = inputUrlOrHandle.trim();

  if (!trimmed) {
    throw new Error('Informe o link ou identificador do canal do YouTube.');
  }

  // Normalização do input
  let handle: string | null = null;
  let channelId: string | null = null;
  let customName: string | null = null;

  if (trimmed.startsWith('@')) {
    handle = trimmed;
  } else {
    // Tenta parsear como URL
    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = `https://${trimmed}`;
    }
    try {
      const url = new URL(trimmed);
      const host = url.hostname.toLowerCase().replace(/^www\./, '');
      if (!host.includes('youtube.com') && !host.includes('youtu.be')) {
        throw new Error('O link informado deve ser do YouTube (youtube.com).');
      }

      const pathname = url.pathname;
      if (pathname.includes('/@')) {
        const match = pathname.match(/\/(@[\w.-]+)/);
        if (match) handle = match[1];
      } else if (pathname.includes('/channel/')) {
        const match = pathname.match(/\/channel\/(UC[\w-]{22})/);
        if (match) channelId = match[1];
      } else if (pathname.includes('/c/')) {
        const match = pathname.match(/\/c\/([\w.-]+)/);
        if (match) customName = match[1];
      } else if (pathname.includes('/user/')) {
        const match = pathname.match(/\/user\/([\w.-]+)/);
        if (match) customName = match[1];
      } else {
        const parts = pathname.split('/').filter(Boolean);
        if (parts.length === 1) {
          if (parts[0].startsWith('@')) handle = parts[0];
          else if (parts[0].startsWith('UC')) channelId = parts[0];
          else handle = `@${parts[0]}`;
        }
      }
    } catch (err: any) {
      if (err.message?.includes('YouTube')) throw err;
      throw new Error('URL de canal do YouTube inválida.');
    }
  }

  let apiUrl = '';
  if (channelId) {
    apiUrl = `https://www.googleapis.com/youtube/v3/channels?id=${encodeURIComponent(channelId)}&part=snippet,contentDetails&key=${apiKey}`;
  } else if (handle) {
    const cleanHandle = handle.replace(/^@/, '');
    apiUrl = `https://www.googleapis.com/youtube/v3/channels?forHandle=${encodeURIComponent(cleanHandle)}&part=snippet,contentDetails&key=${apiKey}`;
  } else if (customName) {
    apiUrl = `https://www.googleapis.com/youtube/v3/channels?forUsername=${encodeURIComponent(customName)}&part=snippet,contentDetails&key=${apiKey}`;
  } else {
    throw new Error('Não foi possível identificar o canal pelo link fornecido.');
  }

  const res = await fetch(apiUrl);
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Erro ao consultar API do YouTube (${res.status}): ${errorBody}`);
  }

  const data = await res.json();
  const items = data.items || [];
  if (items.length === 0) {
    // Tenta fallback com forHandle se customName falhou
    if (customName && !handle) {
      const fallbackUrl = `https://www.googleapis.com/youtube/v3/channels?forHandle=${encodeURIComponent(customName)}&part=snippet,contentDetails&key=${apiKey}`;
      const fallbackRes = await fetch(fallbackUrl);
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        if (fallbackData.items?.length > 0) {
          return parseChannelItem(fallbackData.items[0]);
        }
      }
    }
    throw new Error('Canal não encontrado no YouTube. Verifique o link ou @handle.');
  }

  return parseChannelItem(items[0]);
}

function parseChannelItem(item: any): ChannelResolved {
  const channelId = item.id;
  const snippet = item.snippet || {};
  const channelTitle = snippet.title || 'Canal Oficial';
  const customUrl = snippet.customUrl ? `https://www.youtube.com/${snippet.customUrl}` : `https://www.youtube.com/channel/${channelId}`;
  const avatarUrl = snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || null;

  // Playlist de uploads do canal (prefixo UU no lugar de UC)
  let uploadsPlaylistId = item.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId && channelId.startsWith('UC')) {
    uploadsPlaylistId = 'UU' + channelId.slice(2);
  }

  return {
    channelId,
    channelTitle,
    channelUrl: customUrl,
    avatarUrl,
    uploadsPlaylistId: uploadsPlaylistId || `UU${channelId.slice(2)}`,
  };
}

/**
 * Lê os vídeos recentes da playlist de uploads do canal (maxResults=25, custo = 1 cota).
 */
export async function fetchRecentUploads(
  uploadsPlaylistId: string,
  sinceDate: Date
): Promise<Array<{ videoId: string; title: string; publishedAt: Date; channelTitle: string; channelId: string }>> {
  const apiKey = getApiKey();
  const url = `https://www.googleapis.com/youtube/v3/playlistItems?playlistId=${encodeURIComponent(uploadsPlaylistId)}&part=snippet,contentDetails&maxResults=25&key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Erro ao buscar uploads (${uploadsPlaylistId}): ${res.status}`);
    return [];
  }

  const data = await res.json();
  const items = data.items || [];
  const results: Array<{ videoId: string; title: string; publishedAt: Date; channelTitle: string; channelId: string }> = [];

  for (const item of items) {
    const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
    const publishedAtStr = item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt;
    if (!videoId || !publishedAtStr) continue;

    const publishedAt = new Date(publishedAtStr);
    if (publishedAt >= sinceDate) {
      results.push({
        videoId,
        title: item.snippet?.title || '',
        publishedAt,
        channelTitle: item.snippet?.channelTitle || '',
        channelId: item.snippet?.channelId || '',
      });
    }
  }

  return results;
}

/**
 * Busca detalhes em lote dos vídeos (até 50 por chamada, custo = 1 cota).
 * Aplica os filtros exigidos:
 * - Duração mínima: >= 60s
 * - Duração máxima: <= 600s (10 minutos)
 * - Categoria: 10 (Música)
 * - liveBroadcastContent: 'none'
 * - status.embeddable: true
 * - status.privacyStatus: 'public'
 * - Formato: descartar verticais (embedHeight > embedWidth) e #shorts no título
 */
export async function batchFetchVideoDetails(videoIds: string[]): Promise<Map<string, VideoCandidate>> {
  const apiKey = getApiKey();
  const validVideos = new Map<string, VideoCandidate>();

  if (videoIds.length === 0) return validVideos;

  // Lotes de 50 IDs (limite máximo do YouTube Data API por chamada)
  const chunkSize = 50;
  for (let i = 0; i < videoIds.length; i += chunkSize) {
    const chunk = videoIds.slice(i, i + chunkSize);
    const url = `https://www.googleapis.com/youtube/v3/videos?id=${encodeURIComponent(chunk.join(','))}&part=snippet,contentDetails,status,player&maxHeight=720&key=${apiKey}`;

    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Erro ao consultar detalhes de vídeos em lote (${res.status})`);
      continue;
    }

    const data = await res.json();
    const items = data.items || [];

    for (const item of items) {
      const videoId = item.id;
      const snippet = item.snippet || {};
      const contentDetails = item.contentDetails || {};
      const status = item.status || {};
      const player = item.player || {};

      // 1. Incorporação permitida
      if (status.embeddable !== true) continue;

      // 2. Privacidade pública
      if (status.privacyStatus !== 'public') continue;

      // 3. Categoria estritamente 10 (Música)
      if (snippet.categoryId !== '10') continue;

      // 4. Sem transmissões ao vivo ou estreias agendadas
      if (snippet.liveBroadcastContent && snippet.liveBroadcastContent !== 'none') continue;

      // 5. Duração entre 60s e 600s (1 a 10 minutos)
      const durationSeconds = parseIsoDuration(contentDetails.duration);
      if (durationSeconds < 60 || durationSeconds > 600) continue;

      // 6. Descarte de Shorts verticais (embedHeight > embedWidth)
      if (isVerticalVideo(player.embedHtml)) continue;

      // 7. Descarte adicional se tiver tag #shorts no título
      if (/#shorts\b/i.test(snippet.title || '')) continue;

      const thumbnailUrl =
        snippet.thumbnails?.maxres?.url ||
        snippet.thumbnails?.standard?.url ||
        snippet.thumbnails?.high?.url ||
        snippet.thumbnails?.medium?.url ||
        snippet.thumbnails?.default?.url ||
        null;

      validVideos.set(videoId, {
        videoId,
        title: snippet.title || 'Sem título',
        channelTitle: snippet.channelTitle || '',
        channelId: snippet.channelId || '',
        thumbnailUrl,
        durationSeconds,
        publishedAt: new Date(snippet.publishedAt || Date.now()),
      });
    }
  }

  return validVideos;
}
