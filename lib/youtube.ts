import { cleanEnv } from './env';

export interface ChannelResolved {
  channelId: string;
  channelTitle: string;
  channelUrl: string;
  avatarUrl: string | null;
  uploadsPlaylistId: string;
  subscriberCount: string | null;
  isVerified: boolean;
}

/**
 * Formata contagem de inscritos de forma legível em português (ex: "21,9 mi inscritos", "850 mil inscritos").
 */
export function formatSubscriberCount(countStr?: string | null): string | null {
  if (!countStr) return null;
  const num = parseInt(countStr, 10);
  if (isNaN(num)) return null;
  if (num >= 1_000_000) {
    const val = (num / 1_000_000).toFixed(1).replace('.', ',');
    return `${val.endsWith(',0') ? val.slice(0, -2) : val} mi inscritos`;
  }
  if (num >= 1_000) {
    const val = (num / 1_000).toFixed(1).replace('.', ',');
    return `${val.endsWith(',0') ? val.slice(0, -2) : val} mil inscritos`;
  }
  return `${num} inscritos`;
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

/**
 * Palavras-chave no título que desqualificam o vídeo de ser música/clipe (sem diferenciar maiúsculas e acentos).
 * Facilmente editável conforme necessidade da curadoria.
 */
export const BLOCKED_TITLE_KEYWORDS: string[] = [
  'aftermovie',
  'teaser',
  'trailer',
  'bastidores',
  'making of',
  'vlog',
  'react',
  'entrevista',
  'podcast',
  'live completa',
  'show completo',
  'dvd completo',
  'ensaio',
  'unboxing',
];

export function hasBlockedTitle(title: string): boolean {
  if (!title) return false;
  const normalized = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return BLOCKED_TITLE_KEYWORDS.some((kw) => {
    const normalizedKw = kw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return normalized.includes(normalizedKw);
  });
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
    apiUrl = `https://www.googleapis.com/youtube/v3/channels?id=${encodeURIComponent(target.value)}&part=snippet,contentDetails,statistics,status&key=${apiKey}`;
  } else if (target.type === 'handle') {
    apiUrl = `https://www.googleapis.com/youtube/v3/channels?forHandle=${encodeURIComponent(target.value)}&part=snippet,contentDetails,statistics,status&key=${apiKey}`;
  } else if (target.type === 'customName') {
    apiUrl = `https://www.googleapis.com/youtube/v3/channels?forUsername=${encodeURIComponent(target.value)}&part=snippet,contentDetails,statistics,status&key=${apiKey}`;
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
      const fallbackUrl = `https://www.googleapis.com/youtube/v3/channels?forHandle=${encodeURIComponent(target.value)}&part=snippet,contentDetails,statistics,status&key=${apiKey}`;
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
  const status = item.status || {};
  const statistics = item.statistics || {};
  const channelTitle = snippet.title || 'Canal Oficial';
  const customUrl = snippet.customUrl ? `https://www.youtube.com/${snippet.customUrl}` : `https://www.youtube.com/channel/${channelId}`;
  const avatarUrl = snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || null;

  // Playlist de uploads do canal (prefixo UU no lugar de UC)
  let uploadsPlaylistId = item.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId && channelId.startsWith('UC')) {
    uploadsPlaylistId = 'UU' + channelId.slice(2);
  }

  const subscriberCount = statistics.subscriberCount ? String(statistics.subscriberCount) : null;
  const isVerified = Boolean(status.isVerified || snippet.isVerified);

  return {
    channelId,
    channelTitle,
    channelUrl: customUrl,
    avatarUrl,
    uploadsPlaylistId: uploadsPlaylistId || `UU${channelId.slice(2)}`,
    subscriberCount,
    isVerified,
  };
}

/**
 * Busca estatísticas e dados de verificação em lote para canais existentes (1 chamada na API, até 50 IDs).
 */
export async function batchFetchChannelStats(channelIds: string[]): Promise<Map<string, { subscriberCount: string | null; isVerified: boolean }>> {
  const apiKey = getApiKey();
  const map = new Map<string, { subscriberCount: string | null; isVerified: boolean }>();
  if (channelIds.length === 0) return map;

  const chunkSize = 50;
  for (let i = 0; i < channelIds.length; i += chunkSize) {
    const chunk = channelIds.slice(i, i + chunkSize);
    const url = `https://www.googleapis.com/youtube/v3/channels?id=${encodeURIComponent(chunk.join(','))}&part=snippet,statistics,status&key=${apiKey}`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        for (const item of data.items || []) {
          const subscriberCount = item.statistics?.subscriberCount ? String(item.statistics.subscriberCount) : null;
          const isVerified = Boolean(item.status?.isVerified || item.snippet?.isVerified);
          map.set(item.id, { subscriberCount, isVerified });
        }
      }
    } catch (err: any) {
      console.error('[YouTube API batch channel stats error]:', sanitizeError(err.message, apiKey));
    }
  }
  return map;
}

export interface RawUploadVideo {
  videoId: string;
  title: string;
  publishedAt: Date;
  channelTitle: string;
  channelId: string;
}

export interface ChannelUploadsResult {
  items: RawUploadVideo[];
  totalRead: number;
  outOfWindowCount: number;
  quotaCalls: number;
}

/**
 * Lê os vídeos recentes da playlist de uploads do canal com paginação automática via nextPageToken.
 * Percorre até o item mais antigo ser anterior ao início da janela, com limite de 6 páginas por canal.
 */
export async function fetchRecentUploadsWithPagination(
  uploadsPlaylistId: string,
  sinceDate: Date,
  channelTitleFallback: string = '',
  channelIdFallback: string = '',
  maxPages: number = 6
): Promise<ChannelUploadsResult> {
  const apiKey = getApiKey();
  const items: RawUploadVideo[] = [];

  let pageToken = '';
  let pageCount = 0;
  let quotaCalls = 0;
  let totalRead = 0;
  let outOfWindowCount = 0;

  while (pageCount < maxPages) {
    pageCount++;
    quotaCalls++;

    let url = `https://www.googleapis.com/youtube/v3/playlistItems?playlistId=${encodeURIComponent(uploadsPlaylistId)}&part=snippet,contentDetails&maxResults=50&key=${apiKey}`;
    if (pageToken) {
      url += `&pageToken=${encodeURIComponent(pageToken)}`;
    }

    const res = await fetch(url);
    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`[YouTube API playlistItems error ${res.status}]:`, sanitizeError(errorBody, apiKey));
      break;
    }

    const data = await res.json();
    const pageItems = data.items || [];
    totalRead += pageItems.length;

    let oldestOnPage = new Date();

    for (const item of pageItems) {
      const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
      const publishedAtStr = item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt;
      if (!videoId || !publishedAtStr) continue;

      const publishedAt = new Date(publishedAtStr);
      if (publishedAt < oldestOnPage) {
        oldestOnPage = publishedAt;
      }

      if (publishedAt >= sinceDate) {
        items.push({
          videoId,
          title: item.snippet?.title || '',
          publishedAt,
          channelTitle: item.snippet?.channelTitle || channelTitleFallback,
          channelId: item.snippet?.channelId || channelIdFallback,
        });
      } else {
        outOfWindowCount++;
      }
    }

    if (oldestOnPage < sinceDate || !data.nextPageToken) {
      break;
    }

    pageToken = data.nextPageToken;
  }

  return {
    items,
    totalRead,
    outOfWindowCount,
    quotaCalls,
  };
}

/**
 * Wrapper simples para manter compatibilidade retroativa.
 */
export async function fetchRecentUploads(
  uploadsPlaylistId: string,
  sinceDate: Date,
  maxResults: number = 25
): Promise<Array<{ videoId: string; title: string; publishedAt: Date; channelTitle: string; channelId: string }>> {
  const res = await fetchRecentUploadsWithPagination(uploadsPlaylistId, sinceDate, '', '', 1);
  return res.items.slice(0, maxResults);
}

export interface VideoDetailsResult {
  validVideos: Map<string, VideoCandidate>;
  quotaCalls: number;
  discards: {
    notEmbeddable: number;
    notMusicCategory: number;
    liveOrPremiere: number;
    under60s: number;
    over10m: number;
    isShortOrVertical: number;
    blockedTitle: number;
  };
}

/**
 * Busca detalhes em lote dos vídeos com auditoria detalhada de motivos de descarte e custo de cota.
 */
export async function batchFetchVideoDetailsWithAudit(videoIds: string[]): Promise<VideoDetailsResult> {
  const apiKey = getApiKey();
  const validVideos = new Map<string, VideoCandidate>();
  let quotaCalls = 0;

  const discards = {
    notEmbeddable: 0,
    notMusicCategory: 0,
    liveOrPremiere: 0,
    under60s: 0,
    over10m: 0,
    isShortOrVertical: 0,
    blockedTitle: 0,
  };

  if (videoIds.length === 0) {
    return { validVideos, quotaCalls, discards };
  }

  const chunkSize = 50;
  for (let i = 0; i < videoIds.length; i += chunkSize) {
    const chunk = videoIds.slice(i, i + chunkSize);
    quotaCalls++;
    const url = `https://www.googleapis.com/youtube/v3/videos?id=${encodeURIComponent(chunk.join(','))}&part=snippet,contentDetails,status,player&maxHeight=720&key=${apiKey}`;

    const res = await fetch(url);
    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`[YouTube API videos error ${res.status}]:`, sanitizeError(errorBody, apiKey));
      discards.notEmbeddable += chunk.length;
      continue;
    }

    const data = await res.json();
    const items = data.items || [];
    const foundIds = new Set<string>();

    for (const item of items) {
      const videoId = item.id;
      foundIds.add(videoId);

      const snippet = item.snippet || {};
      const contentDetails = item.contentDetails || {};
      const status = item.status || {};
      const player = item.player || {};

      // 1. Título não musical bloqueado
      if (hasBlockedTitle(snippet.title || '')) {
        discards.blockedTitle++;
        continue;
      }

      // 2. Não incorporável ou não público
      if (status.embeddable !== true || status.privacyStatus !== 'public') {
        discards.notEmbeddable++;
        continue;
      }

      // 3. Categoria estritamente 10 (Música)
      if (snippet.categoryId !== '10') {
        discards.notMusicCategory++;
        continue;
      }

      // 4. Live / estreia
      if (snippet.liveBroadcastContent && snippet.liveBroadcastContent !== 'none') {
        discards.liveOrPremiere++;
        continue;
      }

      // 5. Duração entre 60s e 600s
      const durationSeconds = parseIsoDuration(contentDetails.duration);
      if (durationSeconds < 60) {
        discards.under60s++;
        continue;
      }
      if (durationSeconds > 600) {
        discards.over10m++;
        continue;
      }

      // 6. Shorts verticais ou #shorts
      if (isVerticalVideo(player.embedHtml) || /#shorts\b/i.test(snippet.title || '')) {
        discards.isShortOrVertical++;
        continue;
      }

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

    // IDs do chunk que não foram retornados pela API (excluídos/privados)
    for (const cid of chunk) {
      if (!foundIds.has(cid)) {
        discards.notEmbeddable++;
      }
    }
  }

  return { validVideos, quotaCalls, discards };
}

/**
 * Busca detalhes em lote dos vídeos (wrapper simples).
 */
export async function batchFetchVideoDetails(videoIds: string[]): Promise<Map<string, VideoCandidate>> {
  const res = await batchFetchVideoDetailsWithAudit(videoIds);
  return res.validVideos;
}
