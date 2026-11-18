'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAudio } from '@/contexts/AudioContext';
import { getPlaylistEmbedUrl } from '@/lib/playlist';
import HomeSponsorBanner from '@/components/HomeSponsorBanner';

interface Props {
  initialIsAvailable?: boolean;
  initialPlaylistEmbedUrl?: string | null;
  initialPlaylistUrl?: string | null;
  sponsorUrl?: string | null;
  initialPlaylistTitle?: string;
  initialPlaylistKey?: string | null;
  initialPlaylistVideoIds?: string[];
  initialPlaylistListId?: string | null;
}

export interface PlaylistProgress {
  playlistKey: string;
  index: number;
  seconds: number;
  savedAt: number;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function getSavedProgress(key: string | null): PlaylistProgress | null {
  if (!key || typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('onda_playlist_progress');
    if (!raw) return null;
    const data = JSON.parse(raw) as PlaylistProgress;
    if (data && data.playlistKey === key && typeof data.savedAt === 'number') {
      const now = Date.now();
      if (now - data.savedAt < SEVEN_DAYS_MS && data.savedAt <= now) {
        return data;
      }
    }
    // Senão, apague o progresso antigo
    localStorage.removeItem('onda_playlist_progress');
  } catch {
    // Modo anônimo ou storage bloqueado
  }
  return null;
}

function extractYouTubeVideoId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/i);
  return match ? match[1] : null;
}

// Carregador único da YouTube IFrame API
let ytApiPromise: Promise<any> | null = null;
function loadYouTubeIframeApi(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject();
  if ((window as any).YT && (window as any).YT.Player) {
    return Promise.resolve((window as any).YT);
  }
  if (!ytApiPromise) {
    ytApiPromise = new Promise((resolve) => {
      const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
      const prevCallback = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        if (typeof prevCallback === 'function') prevCallback();
        resolve((window as any).YT);
      };
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.async = true;
        document.head.appendChild(tag);
      }
    });
  }
  return ytApiPromise;
}

export default function HomeRadioCard({
  initialIsAvailable,
  initialPlaylistEmbedUrl,
  initialPlaylistUrl,
  sponsorUrl,
  initialPlaylistTitle,
  initialPlaylistKey,
  initialPlaylistVideoIds,
  initialPlaylistListId,
}: Props) {
  const {
    isConfigLoaded,
    isAvailable: contextIsAvailable,
    isPlaying,
    togglePlay,
    pauseAudio,
    trackInfo,
    hasError,
  } = useAudio();

  // 1. Status da Rádio ao vivo
  const isAvailable = isConfigLoaded ? contextIsAvailable : (initialIsAvailable ?? false);

  // 2. Status e URL da Playlist da Onda
  const initialEmbed =
    initialPlaylistEmbedUrl ||
    (initialPlaylistUrl ? getPlaylistEmbedUrl(initialPlaylistUrl) : null);

  const [playlistEmbedUrl, setPlaylistEmbedUrl] = useState<string | null>(initialEmbed);
  const [playlistTitle, setPlaylistTitle] = useState<string>(initialPlaylistTitle || 'Playlist da Onda');
  const [playlistKey, setPlaylistKey] = useState<string | null>(initialPlaylistKey || null);
  const [playlistVideoIds, setPlaylistVideoIds] = useState<string[]>(initialPlaylistVideoIds || []);
  const [playlistListId, setPlaylistListId] = useState<string | null>(initialPlaylistListId || null);

  const [showIframe, setShowIframe] = useState(false);
  const [savedProgress, setSavedProgress] = useState<PlaylistProgress | null>(null);

  // Refs de controle do Player e Wake Lock
  const playerRef = useRef<any>(null);
  const isPlayingRef = useRef<boolean>(false);
  const saveIntervalRef = useRef<any>(null);
  const wakeLockSentinelRef = useRef<any>(null);
  const shouldResumeRef = useRef<boolean>(false);
  const playlistKeyRef = useRef<string | null>(playlistKey);
  playlistKeyRef.current = playlistKey;

  // Pré-carrega a YouTube IFrame API no cliente e verifica progresso salvo
  useEffect(() => {
    loadYouTubeIframeApi().catch(() => {});
    if (playlistKey) {
      const prog = getSavedProgress(playlistKey);
      setSavedProgress(prog);
    }
  }, [playlistKey]);

  // Atualização dinâmica via /api/config
  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        if (data?.playlistTitle) {
          setPlaylistTitle(data.playlistTitle);
        }
        if (data?.playlistKey) {
          setPlaylistKey(data.playlistKey);
          const prog = getSavedProgress(data.playlistKey);
          setSavedProgress(prog);
        }
        if (data?.playlistVideoIds) {
          try {
            const parsed = typeof data.playlistVideoIds === 'string'
              ? JSON.parse(data.playlistVideoIds)
              : data.playlistVideoIds;
            if (Array.isArray(parsed)) setPlaylistVideoIds(parsed);
          } catch {}
        }
        if (data?.playlistListId) {
          setPlaylistListId(data.playlistListId);
        }
        if (data?.playlistEmbedUrl) {
          setPlaylistEmbedUrl(data.playlistEmbedUrl);
        } else if (data?.playlistUrl) {
          const embed = getPlaylistEmbedUrl(data.playlistUrl);
          setPlaylistEmbedUrl(embed);
        } else if (data?.wavePlaylistUrl) {
          const embed = getPlaylistEmbedUrl(data.wavePlaylistUrl);
          setPlaylistEmbedUrl(embed);
        } else {
          setPlaylistEmbedUrl(null);
        }
      })
      .catch(() => {});
  }, []);

  // Screen Wake Lock API
  const requestWakeLock = useCallback(async () => {
    try {
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && !wakeLockSentinelRef.current) {
        const sentinel = await (navigator as any).wakeLock.request('screen');
        wakeLockSentinelRef.current = sentinel;
        sentinel.addEventListener('release', () => {
          wakeLockSentinelRef.current = null;
        });
      }
    } catch {
      // Ignora erro sem poluir o console ou a tela
      wakeLockSentinelRef.current = null;
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    try {
      if (wakeLockSentinelRef.current) {
        await wakeLockSentinelRef.current.release();
        wakeLockSentinelRef.current = null;
      }
    } catch {
      wakeLockSentinelRef.current = null;
    }
  }, []);

  // Salvamento do progresso da playlist
  const saveCurrentProgress = useCallback(() => {
    const player = playerRef.current;
    const currentKey = playlistKeyRef.current;
    if (!player || !currentKey) return;

    try {
      if (typeof player.getCurrentTime !== 'function' || typeof player.getPlaylistIndex !== 'function') {
        return;
      }
      const seconds = player.getCurrentTime();
      const index = player.getPlaylistIndex();

      if (typeof seconds !== 'number' || isNaN(seconds) || typeof index !== 'number' || index < 0) {
        return;
      }

      const progress: PlaylistProgress = {
        playlistKey: currentKey,
        index,
        seconds,
        savedAt: Date.now(),
      };

      localStorage.setItem('onda_playlist_progress', JSON.stringify(progress));
      setSavedProgress(progress);
    } catch {
      // Modo anônimo / storage desabilitado
    }
  }, []);

  const startSaveInterval = useCallback(() => {
    if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
    saveIntervalRef.current = setInterval(() => {
      saveCurrentProgress();
    }, 5000);
  }, [saveCurrentProgress]);

  const stopSaveInterval = useCallback(() => {
    if (saveIntervalRef.current) {
      clearInterval(saveIntervalRef.current);
      saveIntervalRef.current = null;
    }
  }, []);

  // Ouvintes de ciclo de vida da página: pagehide e visibilitychange
  useEffect(() => {
    const handlePageHide = () => {
      saveCurrentProgress();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveCurrentProgress();
      } else if (document.visibilityState === 'visible') {
        if (isPlayingRef.current) {
          requestWakeLock();
        }
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [saveCurrentProgress, requestWakeLock]);

  // Se a rádio estiver disponível, prioridade máxima é a rádio
  const hasPlaylist = Boolean(playlistEmbedUrl);

  const handleOpenPlaylist = () => {
    // Garante que a rádio seja pausada: nunca dois áudios ao mesmo tempo
    pauseAudio();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('onda-stop-media', { detail: { origin: 'playlist' } }));
    }
    setShowIframe(true);
  };

  const handleContinuePlaylist = () => {
    shouldResumeRef.current = true;
    handleOpenPlaylist();
  };

  const handlePlayFromBeginning = () => {
    shouldResumeRef.current = false;
    handleOpenPlaylist();
  };

  useEffect(() => {
    const handleStopMedia = (e: any) => {
      if (e?.detail?.origin !== 'playlist') {
        saveCurrentProgress();
        releaseWakeLock();
        setShowIframe(false);
      }
    };
    window.addEventListener('onda-stop-media', handleStopMedia);
    return () => {
      window.removeEventListener('onda-stop-media', handleStopMedia);
    };
  }, [saveCurrentProgress, releaseWakeLock]);

  const handleClosePlaylist = () => {
    saveCurrentProgress();
    releaseWakeLock();
    setShowIframe(false);
  };

  // Garante que o body receba classe quando a playlist estiver aberta para ajuste de botões flutuantes (ex: WhatsApp no celular)
  useEffect(() => {
    if (showIframe) {
      document.body.classList.add('playlist-open');
    } else {
      document.body.classList.remove('playlist-open');
    }
    return () => {
      document.body.classList.remove('playlist-open');
    };
  }, [showIframe]);

  // Inicialização e gerenciamento do player do YouTube
  useEffect(() => {
    if (!showIframe) return;

    // Se for Spotify, o iframe simples resolve
    if (playlistEmbedUrl?.includes('spotify.com')) return;

    let isMounted = true;
    let playerInstance: any = null;

    loadYouTubeIframeApi().then((YT) => {
      if (!isMounted) return;

      const p = shouldResumeRef.current ? getSavedProgress(playlistKeyRef.current) : null;
      const startSeconds = p ? Math.max(0, Math.floor(p.seconds) - 3) : 0;
      const index = p ? Math.max(0, p.index || 0) : 0;

      const playerConfig: any = {
        height: '100%',
        width: '100%',
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          autoplay: 1,
          enablejsapi: 1,
          origin: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
        events: {
          onReady: (event: any) => {
            if (!isMounted) return;
            playerRef.current = event.target;

            try {
              if (playlistVideoIds.length > 0) {
                event.target.loadPlaylist(playlistVideoIds, index, startSeconds);
              } else if (playlistListId) {
                event.target.loadPlaylist({
                  list: playlistListId,
                  listType: 'playlist',
                  index,
                  startSeconds,
                });
              } else if (playlistEmbedUrl) {
                const singleId = extractYouTubeVideoId(playlistEmbedUrl);
                if (singleId) {
                  event.target.loadVideoById(singleId, startSeconds);
                }
              }
            } catch {
              // safe fallback
            }
          },
          onStateChange: (event: any) => {
            if (!isMounted) return;
            const state = event.data;

            // PLAYING = 1
            if (state === YT.PlayerState.PLAYING) {
              isPlayingRef.current = true;
              requestWakeLock();
              startSaveInterval();
            }
            // PAUSED = 2
            else if (state === YT.PlayerState.PAUSED) {
              isPlayingRef.current = false;
              releaseWakeLock();
              stopSaveInterval();
              saveCurrentProgress();
            }
            // ENDED = 0
            else if (state === YT.PlayerState.ENDED) {
              isPlayingRef.current = false;
              releaseWakeLock();
              stopSaveInterval();

              try {
                const player = event.target;
                const currentIndex = typeof player.getPlaylistIndex === 'function' ? player.getPlaylistIndex() : -1;
                const playlist = typeof player.getPlaylist === 'function' ? player.getPlaylist() : null;

                const isLast = Array.isArray(playlist) && playlist.length > 0
                  ? currentIndex >= playlist.length - 1
                  : (playlistVideoIds.length > 0 && currentIndex >= playlistVideoIds.length - 1);

                if (isLast) {
                  localStorage.removeItem('onda_playlist_progress');
                  setSavedProgress(null);
                } else {
                  saveCurrentProgress();
                }
              } catch {
                // ignore
              }
            }
          },
        },
      };

      playerInstance = new YT.Player('onda-playlist-yt-player', playerConfig);
      playerRef.current = playerInstance;
    });

    return () => {
      isMounted = false;
      isPlayingRef.current = false;
      stopSaveInterval();
      releaseWakeLock();
      if (playerInstance && typeof playerInstance.destroy === 'function') {
        try {
          playerInstance.destroy();
        } catch {}
      }
      playerRef.current = null;
    };
  }, [
    showIframe,
    playlistEmbedUrl,
    playlistVideoIds,
    playlistListId,
    requestWakeLock,
    releaseWakeLock,
    startSaveInterval,
    stopSaveInterval,
    saveCurrentProgress,
  ]);

  return (
    <div className={`home-radio-wrapper ${showIframe ? 'is-playlist-open' : ''}`}>
      {/* Título Principal */}
      <h1 className="home-title">
        A batida que move o <span className="home-title-accent">Brasil.</span>
      </h1>
      <p className="home-subtitle">
        Rádio, lançamentos e agenda. Tudo num toque.
      </p>

      {/* Hero Grid: Card da Rádio/Playlist (2/3) + Patrocinador Oferecimento (1/3) */}
      <div className="home-hero-grid">
        <div
          className={`home-radio-card ${showIframe ? 'has-open-playlist' : ''}`}
          aria-label="Player de Rádio ao Vivo ou Playlist da Onda"
        >
          {/* Topo do Card: Selo e Controles */}
          <div className="home-radio-top">
            {isAvailable ? (
              // Prioridade 1: Rádio ao Vivo Disponível
              <>
                <div className="home-radio-badge">
                  <span
                    className="home-radio-dot"
                    style={{
                      backgroundColor: isPlaying ? '#25D366' : '#FF5A4F',
                      boxShadow: isPlaying ? '0 0 8px #25D366' : '0 0 8px #FF5A4F',
                    }}
                  />
                  <span className="home-radio-badge-text">
                    {isPlaying ? 'NO AR' : 'AO VIVO'}
                  </span>
                </div>

                {/* Barrinhas de equalizador decorativas */}
                <div className="home-radio-eq" aria-hidden="true">
                  <span className={`eq-bar ${isPlaying ? 'playing' : ''}`} />
                  <span className={`eq-bar ${isPlaying ? 'playing' : ''}`} />
                  <span className={`eq-bar ${isPlaying ? 'playing' : ''}`} />
                  <span className={`eq-bar ${isPlaying ? 'playing' : ''}`} />
                  <span className={`eq-bar ${isPlaying ? 'playing' : ''}`} />
                </div>
              </>
            ) : hasPlaylist ? (
              // Prioridade 2: Sem Rádio, mas com Playlist
              <>
                <div className="home-radio-badge">
                  <span
                    className="home-radio-dot"
                    style={{
                      backgroundColor: '#C2461A',
                      boxShadow: '0 0 8px rgba(194, 70, 26, 0.7)',
                    }}
                  />
                  <span className="home-radio-badge-text">PLAYLIST</span>
                </div>

                {showIframe && (
                  <button
                    type="button"
                    onClick={handleClosePlaylist}
                    className="home-playlist-close-btn"
                    title="Recolher player da playlist"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    <span>Recolher</span>
                  </button>
                )}
              </>
            ) : (
              // Prioridade 3: Sem Rádio e Sem Playlist
              <div className="home-radio-badge">
                <span
                  className="home-radio-dot"
                  style={{
                    backgroundColor: '#B8AF9F',
                    boxShadow: 'none',
                  }}
                />
                <span className="home-radio-badge-text">EM BREVE</span>
              </div>
            )}
          </div>

          {/* Corpo do Card: Alterna entre Rádio, Playlist e Em Breve */}
          {isAvailable ? (
            // PRIORIDADE 1: Rádio ao Vivo
            <div className="home-radio-body">
              <div className="home-radio-cover">
                {trackInfo.coverUrl ? (
                  <img src={trackInfo.coverUrl} alt="Capa da Rádio" />
                ) : (
                  <div className="home-radio-cover-placeholder" aria-hidden="true">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="home-radio-info">
                <h3 className="home-radio-track-title">
                  {trackInfo.title || 'Rádio Onda Sertaneja 24h'}
                </h3>
                <p className="home-radio-track-artist">
                  {hasError
                    ? 'Transmissão indisponível no momento'
                    : trackInfo.artist || 'A batida que move o Brasil'}
                </p>
              </div>

              {/* Botão de Play Redondo de 56px */}
              <button
                type="button"
                className="home-radio-play-btn"
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pausar rádio' : 'Tocar rádio ao vivo'}
                title={isPlaying ? 'Pausar rádio' : 'Ouvir Rádio ao Vivo'}
              >
                {isPlaying ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ marginLeft: '3px' }}>
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                )}
              </button>
            </div>
          ) : hasPlaylist ? (
            // PRIORIDADE 2: Playlist da Onda
            <>
              {!showIframe ? (
                <div className="home-radio-body is-playlist">
                  <div className="home-radio-cover">
                    <div className="home-radio-cover-placeholder" aria-hidden="true">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                      </svg>
                    </div>
                  </div>

                  <div className="home-radio-info">
                    <h3 className="home-radio-track-title">
                      {playlistTitle}
                    </h3>
                    <p className="home-radio-track-artist">
                      Enquanto a rádio não chega, aperta o play!
                    </p>
                  </div>

                  {/* Botão de Ação: "Continuar ouvindo" + "Do início", ou "Ouvir playlist" */}
                  {savedProgress ? (
                    <div className="home-playlist-action-group">
                      <button
                        type="button"
                        className="home-radio-playlist-btn"
                        onClick={handleContinuePlaylist}
                        aria-label="Continuar ouvindo playlist da Onda"
                        title="Continuar de onde parou"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                        <span>Continuar ouvindo</span>
                      </button>

                      <button
                        type="button"
                        className="home-playlist-restart-link"
                        onClick={handlePlayFromBeginning}
                        title="Ouvir playlist do início"
                      >
                        Do início
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="home-radio-playlist-btn"
                      onClick={handlePlayFromBeginning}
                      aria-label="Ouvir playlist da Onda"
                      title="Ouvir playlist"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      <span>Ouvir playlist</span>
                    </button>
                  )}
                </div>
              ) : (
                // O player carrega dentro do card, altura celular 390px
                <div className="home-playlist-iframe-container">
                  {playlistEmbedUrl?.includes('spotify.com') ? (
                    <iframe
                      className="home-playlist-iframe"
                      src={playlistEmbedUrl}
                      title={playlistTitle}
                      loading="lazy"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    />
                  ) : (
                    <div id="onda-playlist-yt-player" className="home-playlist-iframe" />
                  )}
                </div>
              )}
            </>
          ) : (
            // PRIORIDADE 3: Em Breve (Sem rádio e sem playlist)
            <div className="home-radio-body">
              <div className="home-radio-cover">
                <div className="home-radio-cover-placeholder" aria-hidden="true">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                </div>
              </div>

              <div className="home-radio-info">
                <h3 className="home-radio-track-title">
                  Rádio Onda Sertaneja 24h
                </h3>
                <p className="home-radio-track-artist">
                  A rádio ao vivo está chegando. Fique ligado!
                </p>
              </div>
            </div>
          )}
        </div>

        <HomeSponsorBanner sponsorUrl={sponsorUrl} isPlaylistOpen={showIframe} />
      </div>
    </div>
  );
}
