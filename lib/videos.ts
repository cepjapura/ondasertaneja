/**
 * Utilitários de validação e sanitização de vídeos curtos (ShortVideo).
 * Proteção rigorosa contra SSRF e injeção de links arbitrários.
 */

export interface ParsedVideo {
  platform: 'youtube' | 'instagram' | 'tiktok';
  videoId: string;
  normalizedUrl: string;
  embedUrl: string;
  thumbnailUrl?: string | null;
}

const YOUTUBE_REGEX = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:shorts\/|watch\?v=)|youtu\.be\/)([\w-]{11})/;
const INSTAGRAM_REGEX = /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/;
const TIKTOK_DIRECT_REGEX = /^(?:https?:\/\/)?(?:www\.|m\.)?tiktok\.com\/@[\w.-]+\/video\/(\d+)/;
const TIKTOK_SHORT_REGEX = /^(?:https?:\/\/)?(?:vm|vt)\.tiktok\.com\/([\w.-]+)/;

/**
 * Valida a URL e extrai informações essenciais do vídeo.
 * Rejeita qualquer domínio fora da whitelist (YouTube Shorts, Instagram Reels, TikTok).
 */
export async function parseAndValidateVideoUrl(rawUrl: string, customThumbnail?: string | null): Promise<ParsedVideo> {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('URL do vídeo é obrigatória.');
  }

  const url = rawUrl.trim();

  // 1. YouTube Shorts / Videos
  const ytMatch = url.match(YOUTUBE_REGEX);
  if (ytMatch) {
    const videoId = ytMatch[1];
    return {
      platform: 'youtube',
      videoId,
      normalizedUrl: `https://www.youtube.com/shorts/${videoId}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1`,
      thumbnailUrl: customThumbnail?.trim() || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
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
      };
    } catch (err: any) {
      throw new Error(`Não foi possível resolver o link curto do TikTok: ${err.message || 'Verifique se o vídeo é público.'}`);
    }
  }

  throw new Error('URL inválida. Apenas links de youtube.com/shorts, youtu.be, tiktok.com e instagram.com/reel são aceitos.');
}
