/**
 * Utilitários de validação e geração de embeds para a "Playlist da Onda".
 * Suporta exclusivamente playlists do Spotify e do YouTube / YouTube Music.
 */

export interface PlaylistInfo {
  platform: 'spotify' | 'youtube';
  id: string;
  embedUrl: string;
  originalUrl: string;
}

/**
 * Valida se a URL fornecida pertence estritamente a um dos formatos permitidos:
 * - Spotify: open.spotify.com/playlist/{id}
 * - YouTube: youtube.com/playlist?list={id}
 * - YouTube Music: music.youtube.com/playlist?list={id}
 *
 * Recusa qualquer outro domínio ou formato (faixas isoladas, canais, embeds diretos, etc).
 * Extrai o ID e monta o embed a partir dele:
 * - Spotify: https://open.spotify.com/embed/playlist/{id}?theme=0 (tema escuro)
 * - YouTube: https://www.youtube-nocookie.com/embed/videoseries?list={id}
 */
export function parseAndValidatePlaylistUrl(rawUrl: string): PlaylistInfo {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('A URL da playlist é obrigatória.');
  }

  let trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error('A URL da playlist não pode ser vazia.');
  }

  // Se o usuário não incluiu o protocolo, adiciona https:// para viabilizar URL parsing
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('URL de playlist inválida.');
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const pathname = parsed.pathname;

  // 1. SPOTIFY: aceita SOMENTE open.spotify.com/playlist/{id}
  if (hostname === 'open.spotify.com') {
    // Regex estrito para /playlist/{id}
    const match = pathname.match(/^\/playlist\/([a-zA-Z0-9]+)\/?$/);
    if (!match || !match[1]) {
      throw new Error(
        'Formato do Spotify inválido. O link deve ser de uma playlist: open.spotify.com/playlist/{id}'
      );
    }

    const playlistId = match[1];
    return {
      platform: 'spotify',
      id: playlistId,
      // Spotify com tema escuro via parâmetro theme=0
      embedUrl: `https://open.spotify.com/embed/playlist/${playlistId}?theme=0`,
      originalUrl: `https://open.spotify.com/playlist/${playlistId}`,
    };
  }

  // 2. YOUTUBE ou YOUTUBE MUSIC: aceita SOMENTE youtube.com/playlist?list={id} e music.youtube.com/playlist?list={id}
  if (hostname === 'youtube.com' || hostname === 'music.youtube.com') {
    // O pathname DEVE ser estritamente /playlist
    if (pathname !== '/playlist' && pathname !== '/playlist/') {
      throw new Error(
        'Formato do YouTube inválido. O link deve ser uma playlist: youtube.com/playlist?list={id}'
      );
    }

    const listId = parsed.searchParams.get('list');
    if (!listId || !/^[a-zA-Z0-9_-]+$/.test(listId)) {
      throw new Error(
        'ID da playlist do YouTube não encontrado ou inválido no parâmetro "?list=".'
      );
    }

    return {
      platform: 'youtube',
      id: listId,
      // Embed seguro do YouTube (youtube-nocookie)
      embedUrl: `https://www.youtube-nocookie.com/embed/videoseries?list=${listId}`,
      originalUrl: `https://${hostname}/playlist?list=${listId}`,
    };
  }

  // Recusa qualquer outro domínio
  throw new Error(
    'Domínio não suportado. Aceita SOMENTE open.spotify.com/playlist/{id}, youtube.com/playlist?list={id} e music.youtube.com/playlist?list={id}.'
  );
}

/**
 * Função segura que tenta extrair a URL de embed. Retorna null se for inválida ou vazia.
 */
export function getPlaylistEmbedUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;
  try {
    const info = parseAndValidatePlaylistUrl(rawUrl);
    return info.embedUrl;
  } catch {
    return null;
  }
}
