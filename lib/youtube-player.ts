/**
 * Utilitários e gerenciador da YouTube IFrame Player API (host youtube-nocookie.com)
 * Garante carregamento sob demanda, persistência de sequência e coordenação entre players.
 */

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
    _ytApiPromise?: Promise<any>;
  }
}

const STORAGE_KEY_SEQUENCE = 'onda_video_autoplay_sequence';

/**
 * Carrega a API do YouTube sob demanda APENAS no primeiro toque do usuário.
 * Nunca na abertura da página.
 */
export function loadYouTubeIframeApi(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }

  if (window.YT && window.YT.Player) {
    return Promise.resolve(window.YT);
  }

  if (window._ytApiPromise) {
    return window._ytApiPromise;
  }

  window._ytApiPromise = new Promise((resolve) => {
    const existingScript = document.getElementById('youtube-iframe-api');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'youtube-iframe-api';
      script.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(script);
    }

    const previousOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousOnReady === 'function') {
        previousOnReady();
      }
      resolve(window.YT);
    };
  });

  return window._ytApiPromise;
}

/**
 * Lê a preferência de sequência automática do localStorage com segurança.
 * Padrão: true (ligada).
 */
export function getSequencePreference(defaultValue = true): boolean {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SEQUENCE);
    if (stored !== null) {
      return stored === 'true';
    }
  } catch (err) {
    // localStorage bloqueado ou em modo anônimo
  }
  return defaultValue;
}

/**
 * Salva a preferência de sequência automática no localStorage com segurança.
 */
export function setSequencePreference(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_SEQUENCE, String(enabled));
  } catch (err) {
    // localStorage bloqueado ou em modo anônimo
  }
}

/**
 * Notifica todos os players (rádio, playlist da onda e outros carrosséis) para pausar/fechar.
 * Garante a regra: nunca dois players ao mesmo tempo.
 */
export function stopAllOtherMedia(origin: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('onda-stop-media', { detail: { origin } }));
}
