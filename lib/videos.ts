/**
 * Utilitários de validação e sanitização de vídeos (Top Vídeos e Shorts da Onda).
 * Proteção rigorosa contra SSRF e injeção de links arbitrários.
 */

export type VideoSection = 'TOP_VIDEOS' | 'SHORTS';

export interface ParsedVideo {
  platform: 'youtube' | 'instagram' | 'tiktok';
  videoId: string;
  normalizedUrl: string;
  embedUrl: string;
  thumbnailUrl?: string | null;
  suggestedSection: VideoSection;
}

/**
 * Endereço oficial do canal da Onda Sertaneja no YouTube.
 * Constante centralizada e de fácil alteração.
 */
export const ONDA_SERTANEJA_CHANNEL_URL = 'https://www.youtube.com/@ondasertaneja';

const YOUTUBE_REGEX = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:shorts\/|watch\?v=)|youtu\.be\/)([\w-]{11})/;
const INSTAGRAM_REGEX = /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/;
const TIKTOK_DIRECT_REGEX = /^(?:https?:\/\/)?(?:www\.|m\.)?tiktok\.com\/@[\w.-]+\/video\/(\d+)/;
const TIKTOK_SHORT_REGEX = /^(?:https?:\/\/)?(?:vm|vt)\.tiktok\.com\/([\w.-]+)/;

/**
 * Consulta a oEmbed pública do YouTube no servidor:
 * - Se author_url corresponder ao canal da Onda Sertaneja (@ondasertaneja) -> SHORTS ("Shorts da Onda")
 * - Se for de outro canal -> TOP_VIDEOS ("Top Vídeos")
 * - Se a consulta falhar ou timeout -> TOP_VIDEOS ("Top Vídeos")
 */
export async function detectVideoSectionWithOEmbed(rawUrl: string): Promise<VideoSection> {
  if (!rawUrl || typeof rawUrl !== 'string') return 'TOP_VIDEOS';

  const trimmed = rawUrl.trim();
  const ytMatch = trimmed.match(YOUTUBE_REGEX);
  if (!ytMatch) {
    return 'TOP_VIDEOS';
  }

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(trimmed)}&format=json`;
    const res = await fetch(oembedUrl, {
      headers: { 'User-Agent': 'OndaSertanejaBot/1.0' },
      signal: AbortSignal.timeout(3500),
    });

    if (!res.ok) {
      return 'TOP_VIDEOS';
    }

    const data = await res.json();
    const authorUrl = (data?.author_url || '').toLowerCase().trim().replace(/\/+$/, '');
    const targetUrl = ONDA_SERTANEJA_CHANNEL_URL.toLowerCase().trim().replace(/\/+$/, '');

    // Verifica se author_url corresponde ao canal da Onda Sertaneja
    if (authorUrl === targetUrl || authorUrl.includes('@ondasertaneja')) {
      return 'SHORTS';
    }

    return 'TOP_VIDEOS';
  } catch {
    // Se a consulta falhar (timeout, rede, erro de JSON), sugere Top Vídeos
    return 'TOP_VIDEOS';
  }
}

/**
 * Fallback síncrono rápido:
 * Mantido para retrocompatibilidade quando não for viável aguardar oEmbed.
 */
export function detectVideoSection(rawUrl: string): VideoSection {
  if (!rawUrl || typeof rawUrl !== 'string') return 'TOP_VIDEOS';
  const url = rawUrl.trim().toLowerCase();

  if (url.includes('@ondasertaneja')) {
    return 'SHORTS';
  }

  return 'TOP_VIDEOS';
}

/**
 * Retorna a etiqueta correta conforme a seção e plataforma:
 * - Se TOP_VIDEOS: "" (Top Vídeos usa número de ranking 1, 2, 3...)
 * - Se SHORTS: "SHORTS", "TIKTOK" ou "REELS"
 */
export function getVideoBadgeLabel(section?: string | null, platform?: string | null): string {
  if (section === 'TOP_VIDEOS') {
    return 'TOP VÍDEOS';
  }
  const plat = (platform || '').toLowerCase();
  if (plat === 'tiktok') return 'TIKTOK';
  if (plat === 'instagram') return 'REELS';
  return 'SHORTS';
}

/**
 * Valida a URL e extrai informações essenciais do vídeo.
 * Whitelist: YouTube (vídeos normais e shorts), Instagram Reels, TikTok.
 */
export async function parseAndValidateVideoUrl(rawUrl: string, customThumbnail?: string | null): Promise<ParsedVideo> {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('URL do vídeo é obrigatória.');
  }

  const url = rawUrl.trim();

  // 1. YouTube (Shorts ou Clipe normal)
  const ytMatch = url.match(YOUTUBE_REGEX);
  if (ytMatch) {
    const videoId = ytMatch[1];
    const isShorts = url.toLowerCase().includes('/shorts/');
    const normalizedUrl = isShorts
      ? `https://www.youtube.com/shorts/${videoId}`
      : `https://www.youtube.com/watch?v=${videoId}`;

    // Consulta oEmbed pública para determinar a seção sugerida
    const suggestedSection = await detectVideoSectionWithOEmbed(normalizedUrl);

    return {
      platform: 'youtube',
      videoId,
      normalizedUrl,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1`,
      thumbnailUrl: customThumbnail?.trim() || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      suggestedSection,
    };
  }

  // 2. Instagram Reels
  const igMatch = url.match(INSTAGRAM_REGEX);
  if (igMatch) {
    const shortcode = igMatch[1];
    return {
      platform: 'instagram',
      videoId: shortcode,
      normalizedUrl: `https://www.instagram.com/reel/${shortcode}/`,
      embedUrl: `https://www.instagram.com/reel/${shortcode}/embed/`,
      thumbnailUrl: customThumbnail?.trim() || null,
      suggestedSection: 'TOP_VIDEOS',
    };
  }

  // 3. TikTok - Link Direto com ID numérico
  const ttDirectMatch = url.match(TIKTOK_DIRECT_REGEX);
  if (ttDirectMatch) {
    const videoId = ttDirectMatch[1];
    return {
      platform: 'tiktok',
      videoId,
      normalizedUrl: url,
      embedUrl: `https://www.tiktok.com/embed/v2/${videoId}`,
      thumbnailUrl: customThumbnail?.trim() || null,
      suggestedSection: 'TOP_VIDEOS',
    };
  }

  // 4. TikTok - Link Encurtado (vm.tiktok.com / vt.tiktok.com)
  const ttShortMatch = url.match(TIKTOK_SHORT_REGEX);
  if (ttShortMatch) {
    try {
      const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
      const oembedRes = await fetch(oembedUrl, {
        headers: { 'User-Agent': 'OndaSertanejaBot/1.0' },
        signal: AbortSignal.timeout(6000),
      });

      if (!oembedRes.ok) {
        throw new Error(`Falha na API oEmbed do TikTok (Status ${oembedRes.status}).`);
      }

      const oembedData = await oembedRes.json();
      const html = oembedData?.html || '';

      // Tenta extrair o data-video-id do HTML retornado pela oEmbed oficial
      const idMatch = html.match(/data-video-id="(\d+)"/) || html.match(/\/video\/(\d+)/);
      if (!idMatch) {
        throw new Error('Não foi possível identificar o ID numérico do vídeo no retorno do TikTok.');
      }

      const videoId = idMatch[1];
      return {
        platform: 'tiktok',
        videoId,
        normalizedUrl: url,
        embedUrl: `https://www.tiktok.com/embed/v2/${videoId}`,
        thumbnailUrl: customThumbnail?.trim() || oembedData.thumbnail_url || null,
        suggestedSection: 'TOP_VIDEOS',
      };
    } catch (err: any) {
      throw new Error(`Não foi possível resolver o link curto do TikTok: ${err.message || 'Verifique se o vídeo é público.'}`);
    }
  }

  throw new Error('URL inválida. Apenas links de YouTube (clipes e shorts), TikTok e Instagram Reels são aceitos.');
}
