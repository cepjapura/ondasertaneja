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
 * Remove qualquer ocorrência da chave da API das mensagens de erro ou logs.
 */
export function sanitizeError(text: string, apiKey?: string): string {
  if (!text) return '';
  if (!apiKey) return text;
  return text.split(apiKey).join('[REDACTED_API_KEY]');
}

/**
 * Converte respostas de erro da YouTube API em mensagens amigáveis para o usuário.
 */
export function parseYouTubeApiError(status: number, responseBody: string): string {
  try {
    const parsed = JSON.parse(responseBody);
    const errorObj = parsed.error || {};
    const message = (errorObj.message || '').toLowerCase();
    const reason = errorObj.errors?.[0]?.reason || '';

    if (
      status === 400 ||
      reason === 'keyInvalid' ||
      reason === 'badRequest' ||
      message.includes('api key') ||
      message.includes('key not valid')
    ) {
      return 'Chave da API do YouTube inválida ou ainda não ativada. Confira a YOUTUBE_API_KEY.';
    }

    if (reason === 'quotaExceeded' || message.includes('quota')) {
      return 'Cota diária da API do YouTube excedida. Tente novamente mais tarde.';
    }

    if (status === 403 || reason === 'accessNotConfigured') {
      return 'Acesso à API do YouTube bloqueado ou não ativado no Google Cloud. Confira as permissões da YOUTUBE_API_KEY.';
    }

    if (status === 404) {
      return 'Canal não encontrado no YouTube. Verifique o link ou @handle.';
    }

    if (status >= 500) {
      return 'Serviço do YouTube temporariamente indisponível. Tente novamente em instantes.';
    }
  } catch {
    // Se o corpo não for JSON
  }

  if (status === 400) {
    return 'Chave da API do YouTube inválida ou ainda não ativada. Confira a YOUTUBE_API_KEY.';
  }
  if (status === 403) {
    return 'Acesso à API do YouTube bloqueado ou não ativado no Google Cloud. Confira as permissões da YOUTUBE_API_KEY.';
  }

  return 'Erro ao consultar a API do YouTube. Tente novamente mais tarde.';
}

export interface ParsedChannelTarget {
  type: 'handle' | 'channelId' | 'customName';
  value: string;
}

/**
 * Validação rigorosa do link de canal:
 * - Aceita @handle digitado sozinho.
 * - Parse via new URL(): protocolo https, host youtube.com / www.youtube.com / m.youtube.com.
 * - Aceita exclusivamente caminhos /@handle, /channel/UC... e /c/nome.
 * - Qualquer outro formato lança "Link de canal do YouTube inválido."
 */
export function validateAndParseChannelInput(input: string): ParsedChannelTarget {
  const trimmed = (input || '').trim();
  if (!trimmed) {
    throw new Error('Link de canal do YouTube inválido.');
  }

  // 1. Aceite também um @handle digitado sozinho
  if (trimmed.startsWith('@')) {
    const handleMatch = trimmed.match(/^@([\w.-]+)$/);
    if (!handleMatch) {
      throw new Error('Link de canal do YouTube inválido.');
    }
    return { type: 'handle', value: handleMatch[1] };
  }

  // 2. Parse com new URL()
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error('Link de canal do YouTube inválido.');
  }

  // 3. Exija protocolo https
  if (url.protocol !== 'https:') {
    throw new Error('Link de canal do YouTube inválido.');
  }

  // 4. Hostname EXATAMENTE youtube.com, www.youtube.com ou m.youtube.com
  const allowedHosts = ['youtube.com', 'www.youtube.com', 'm.youtube.com'];
  const host = url.hostname.toLowerCase();
  if (!allowedHosts.includes(host)) {
    throw new Error('Link de canal do YouTube inválido.');
  }

  // 5. Aceite só os caminhos /@handle, /channel/UC... e /c/nome
  const pathname = url.pathname;

  // /@handle (ex.: /@gusttavolima ou /@gusttavolima/)
  const handleMatch = pathname.match(/^\/@([\w.-]+)\/?$/);
  if (handleMatch) {
    return { type: 'handle', value: handleMatch[1] };
  }

  // /channel/UC... (ex.: /channel/UCwPf4y1u3fVve1u0o_H95eQ)
  const channelMatch = pathname.match(/^\/channel\/(UC[\w-]{22})\/?$/);
  if (channelMatch) {
    return { type: 'channelId', value: channelMatch[1] };
  }

  // /c/nome (ex.: /c/gusttavolimaoficial)
  const customMatch = pathname.match(/^\/c\/([\w.-]+)\/?$/);
  if (customMatch) {
    return { type: 'customName', value: customMatch[1] };
  }

  // Qualquer outra coisa deve mostrar "Link de canal do YouTube inválido."
  throw new Error('Link de canal do YouTube inválido.');
}

/**
 * Resolve canal oficial do YouTube a partir de URL validada ou @handle.
 */
export async function resolveChannel(inputUrlOrHandle: string): Promise<ChannelResolved> {
  const target = validateAndParseChannelInput(inputUrlOrHandle);
  const apiKey = getApiKey();

  let apiUrl = '';
  if (target.type === 'channelId') {
    apiUrl = `https://www.googleapis.com/youtube/v3/channels?id=${encodeURIComponent(target.value)}&part=snippet,contentDetails&key=${apiKey}`;
  } else if (target.type === 'handle') {
    apiUrl = `https://www.googleapis.com/youtube/v3/channels?forHandle=${encodeURIComponent(target.value)}&part=snippet,contentDetails&key=${apiKey}`;
  } else if (target.type === 'customName') {
    apiUrl = `https://www.googleapis.com/youtube/v3/channels?forUsername=${encodeURIComponent(target.value)}&part=snippet,contentDetails&key=${apiKey}`;
  }

  let res: Response;
  try {
    res = await fetch(apiUrl);
  } catch (netErr: any) {
    console.error('[YouTube API fetch network error]', sanitizeError(netErr?.message || '', apiKey));
    throw new Error('Falha de conexão com a API do YouTube. Tente novamente mais tarde.');
  }

  if (!res.ok) {
    const errorBody = await res.text();
    // Registra detalhe no log do servidor sem vazar a chave
    console.error(`[YouTube API channels error ${res.status}]:`, sanitizeError(errorBody, apiKey));
    // Lança mensagem amigável sem JSON bruto
    throw new Error(parseYouTubeApiError(res.status, errorBody));
  }

  const data = await res.json();
  const items = data.items || [];
  if (items.length === 0) {
    // Tenta fallback com forHandle se customName falhou
    if (target.type === 'customName') {
      const fallbackUrl = `https://www.googleapis.com/youtube/v3/channels?forHandle=${encodeURIComponent(target.value)}&part=snippet,contentDetails&key=${apiKey}`;
      try {
        const fallbackRes = await fetch(fallbackUrl);
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (fallbackData.items?.length > 0) {
            return parseChannelItem(fallbackData.items[0]);
          }
        } else {
          const fallbackBody = await fallbackRes.text();
          console.error(`[YouTube API fallback error ${fallbackRes.status}]:`, sanitizeError(fallbackBody, apiKey));
        }
      } catch (fbErr: any) {
        console.error('[YouTube API fallback network error]', sanitizeError(fbErr?.message || '', apiKey));
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
    const errorBody = await res.text(); console.error(`[YouTube API playlistItems error ${res.status}]:`, sanitizeError(errorBody, apiKey));
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
      const errorBody = await res.text(); console.error(`[YouTube API videos error ${res.status}]:`, sanitizeError(errorBody, apiKey));
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
