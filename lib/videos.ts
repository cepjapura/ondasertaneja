/**
 * Utilitários de validação e sanitização de vídeos (Top Vídeos 16:9 e Shorts 9:16).
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

const YOUTUBE_REGEX = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:shorts\/|watch\?v=)|youtu\.be\/)([\w-]{11})/;
const INSTAGRAM_REGEX = /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/;
const TIKTOK_DIRECT_REGEX = /^(?:https?:\/\/)?(?:www\.|m\.)?tiktok\.com\/@[\w.-]+\/video\/(\d+)/;
const TIKTOK_SHORT_REGEX = /^(?:https?:\/\/)?(?:vm|vt)\.tiktok\.com\/([\w.-]+)/;

/**
 * Detecta automaticamente a seção recomendada com base no formato da URL:
 * - youtube.com/shorts, TikTok e Instagram Reels -> SHORTS
 * - links normais do YouTube (watch?v=, youtu.be) -> TOP_VIDEOS
 */
export function detectVideoSection(rawUrl: string): VideoSection {
  if (!rawUrl || typeof rawUrl !== 'string') return 'SHORTS';
  const url = rawUrl.trim().toLowerCase();

  if (url.includes('/shorts/') || url.includes('tiktok.com') || url.includes('instagram.com')) {
    return 'SHORTS';
  }

  if (url.includes('watch?v=') || url.includes('youtu.be/')) {
    return 'TOP_VIDEOS';
  }

  return 'SHORTS';
}

/**
 * Retorna a etiqueta correta conforme a seção e plataforma:
 * - Se TOP_VIDEOS: "CLIPE"
 * - Se SHORTS: "SHORTS", "TIKTOK" ou "REELS"
 */
export function getVideoBadgeLabel(section?: string | null, platform?: string | null): string {
  if (section === 'TOP_VIDEOS') {
    return 'CLIPE';
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
    const suggestedSection: VideoSection = isShorts ? 'SHORTS' : 'TOP_VIDEOS';
    const normalizedUrl = isShorts
      ? `https://www.youtube.com/shorts/${videoId}`
      : `https://www.youtube.com/watch?v=${videoId}`;

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
      suggestedSection: 'SHORTS',
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
      suggestedSection: 'SHORTS',
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
        suggestedSection: 'SHORTS',
      };
    } catch (err: any) {
      throw new Error(`Não foi possível resolver o link curto do TikTok: ${err.message || 'Verifique se o vídeo é público.'}`);
    }
  }

  throw new Error('URL inválida. Apenas links de YouTube (clipes e shorts), TikTok e Instagram Reels são aceitos.');
}
