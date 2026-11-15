'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  loadYouTubeIframeApi,
  getSequencePreference,
  setSequencePreference,
  stopAllOtherMedia,
} from '@/lib/youtube-player';

export interface TopVideoItem {
  id: string;
  title: string;
  url: string;
  platform: string; // 'youtube' | 'tiktok' | 'instagram'
  thumbnailUrl?: string | null;
  sortOrder: number;
}

interface Props {
  videos: TopVideoItem[];
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:shorts\/|v\/|watch\?v=|youtu\.be\/)([\w-]{11})/);
  return match ? match[1] : null;
}

function extractInstagramId(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

function extractTikTokId(url: string): string | null {
  const match = url.match(/video\/(\d+)/);
  return match ? match[1] : null;
}

export default function TopVideosCarousel({ videos }: Props) {
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [isSequenceActive, setIsSequenceActive] = useState<boolean>(true);
  const [needsUserInteraction, setNeedsUserInteraction] = useState<boolean>(false);

  const carouselRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const ytPlayerRef = useRef<any>(null);
  const activeVideoRef = useRef<string | null>(null);
  const isSequenceActiveRef = useRef<boolean>(true);

  // Inicializa preferência de sequência do localStorage
  useEffect(() => {
    const pref = getSequencePreference(true);
    setIsSequenceActive(pref);
    isSequenceActiveRef.current = pref;
  }, []);

  const handleToggleSequence = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSequenceActive((prev) => {
      const next = !prev;
      isSequenceActiveRef.current = next;
      setSequencePreference(next);
      return next;
    });
  };

  // Mantém ref atualizada do activeVideoId
  useEffect(() => {
    activeVideoRef.current = activeVideoId;
  }, [activeVideoId]);

  // Destrói o player YT atual
  const destroyYtPlayer = useCallback(() => {
    if (ytPlayerRef.current) {
      try {
        if (typeof ytPlayerRef.current.destroy === 'function') {
          ytPlayerRef.current.destroy();
        }
      } catch (err) {
        // Ignora erro de desmontagem do iframe
      }
      ytPlayerRef.current = null;
    }
  }, []);

  // Fecha o player
  const closePlayer = useCallback(() => {
    destroyYtPlayer();
    setActiveVideoId(null);
    setNeedsUserInteraction(false);
  }, [destroyYtPlayer]);

  // Ouve evento global para fechar quando outra mídia começar
  useEffect(() => {
    const handleStopMedia = (e: any) => {
      if (e?.detail?.origin !== 'top-videos') {
        closePlayer();
      }
    };
    window.addEventListener('onda-stop-media', handleStopMedia);
    return () => {
      window.removeEventListener('onda-stop-media', handleStopMedia);
    };
  }, [closePlayer]);

  // Rola suavemente o carrossel apenas no eixo horizontal (sem pular a página)
  const scrollToCard = useCallback((videoId: string) => {
    const container = carouselRef.current;
    const card = cardRefs.current[videoId];
    if (!container || !card) return;

    const cardLeft = card.offsetLeft;
    const cardWidth = card.clientWidth;
    const containerWidth = container.clientWidth;
    const targetScrollLeft = cardLeft - (containerWidth - cardWidth) / 2;

    container.scrollTo({
      left: Math.max(0, targetScrollLeft),
      behavior: 'smooth',
    });
  }, []);

  // Abre e toca um vídeo específico
  const playVideo = useCallback(
    (video: TopVideoItem, isAutoAdvance = false) => {
      destroyYtPlayer();
      setNeedsUserInteraction(false);
      setActiveVideoId(video.id);

      // Regra: nunca dois players ao mesmo tempo
      stopAllOtherMedia('top-videos');

      // Rola suavemente até o card
      scrollToCard(video.id);
    },
    [destroyYtPlayer, scrollToCard]
  );

  // Avança para o próximo vídeo da seção
  const goToNextVideo = useCallback(
    (isManual = false) => {
      const currentId = activeVideoRef.current;
      if (!currentId) return;

      const currentIndex = videos.findIndex((v) => v.id === currentId);
      if (currentIndex === -1) return;

      const nextIndex = currentIndex + 1;
      if (nextIndex < videos.length) {
        playVideo(videos[nextIndex], !isManual);
      } else {
        // No último vídeo da seção, para
        closePlayer();
      }
    },
    [videos, playVideo, closePlayer]
  );

  // Inicializa o YouTube Player quando um vídeo for ativado
  useEffect(() => {
    if (!activeVideoId) return;

    const currentVideo = videos.find((v) => v.id === activeVideoId);
    if (!currentVideo) return;

    // Se for YouTube, usa a YouTube IFrame API
    const isYt = currentVideo.platform === 'youtube' || !currentVideo.platform;
    const ytId = extractYouTubeId(currentVideo.url);
    if (!isYt || !ytId) return;

    const containerId = `yt-player-top-${currentVideo.id}`;

    let isSubscribed = true;
    let autoplayCheckTimer: NodeJS.Timeout | null = null;

    // Carrega a API sob demanda apenas no toque
    loadYouTubeIframeApi().then((YT) => {
      if (!isSubscribed || !YT || !YT.Player) return;

      const container = document.getElementById(containerId);
      if (!container) return;

      destroyYtPlayer();

      try {
        const player = new YT.Player(containerId, {
          host: 'https://www.youtube-nocookie.com',
          videoId: ytId,
          playerVars: {
            autoplay: 1,
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            origin: typeof window !== 'undefined' ? window.location.origin : '',
          },
          events: {
            onReady: (event: any) => {
              if (!isSubscribed) return;
              try {
                event.target.playVideo();
              } catch (e) {
                setNeedsUserInteraction(true);
              }

              // Checa se o autoplay foi bloqueado pelo navegador (iOS Safari)
              autoplayCheckTimer = setTimeout(() => {
                if (!isSubscribed) return;
                try {
                  const state = event.target.getPlayerState();
                  // 1 = PLAYING, 3 = BUFFERING
                  if (state !== 1 && state !== 3) {
                    setNeedsUserInteraction(true);
                  }
                } catch {
                  setNeedsUserInteraction(true);
                }
              }, 1400);
            },
            onStateChange: (event: any) => {
              if (!isSubscribed) return;
              // 1 = PLAYING
              if (event.data === 1) {
                setNeedsUserInteraction(false);
              }
              // 0 = ENDED
              if (event.data === 0) {
                if (isSequenceActiveRef.current) {
                  goToNextVideo(false);
                }
              }
            },
            onError: () => {
              if (isSubscribed) {
                setNeedsUserInteraction(true);
              }
            },
          },
        });

        ytPlayerRef.current = player;
      } catch (err) {
        setNeedsUserInteraction(true);
      }
    });

    return () => {
      isSubscribed = false;
      if (autoplayCheckTimer) clearTimeout(autoplayCheckTimer);
    };
  }, [activeVideoId, videos, destroyYtPlayer, goToNextVideo]);

  if (!videos || videos.length === 0) {
    return null;
  }

  const getThumbnail = (video: TopVideoItem) => {
    if (video.thumbnailUrl) return video.thumbnailUrl;
    if (video.platform === 'youtube' || !video.platform) {
      const ytId = extractYouTubeId(video.url);
      if (ytId) return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
    }
    if (video.platform === 'tiktok') {
      return `/api/proxy-thumbnail?id=${video.id}`;
    }
    return null;
  };

  const getEmbedUrl = (video: TopVideoItem) => {
    if (video.platform === 'instagram') {
      const igId = extractInstagramId(video.url);
      return igId ? `https://www.instagram.com/reel/${igId}/embed/` : null;
    }
    if (video.platform === 'tiktok') {
      const ttId = extractTikTokId(video.url);
      return ttId ? `https://www.tiktok.com/embed/v2/${ttId}` : null;
    }
    return video.url;
  };

  const handleManualResume = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNeedsUserInteraction(false);
    if (ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
      try {
        ytPlayerRef.current.playVideo();
      } catch (err) {
        // Fallback
      }
    }
  };

  return (
    <section className="top-videos-section" aria-label="Top Vídeos">
      <div className="section-header-compact">
        <h2 className="section-title-clean">Top Vídeos</h2>
      </div>

      <div
        ref={carouselRef}
        className="top-videos-carousel"
        role="region"
        aria-label="Carrossel Top Vídeos"
      >
        {videos.map((video, index) => {
          const isActive = activeVideoId === video.id;
          const isLast = index === videos.length - 1;
          const thumbnail = getThumbnail(video);
          const isYt = video.platform === 'youtube' || !video.platform;
          const embedUrl = !isYt ? getEmbedUrl(video) : null;

          return (
            <div
              key={video.id}
              ref={(el) => {
                cardRefs.current[video.id] = el;
              }}
              className={`top-video-card ${isActive ? 'is-active-card' : ''}`}
            >
              {isActive ? (
                <div className="top-video-iframe-wrapper">
                  {/* Container do Player */}
                  {isYt ? (
                    <div
                      id={`yt-player-top-${video.id}`}
                      className="top-video-iframe"
                    />
                  ) : embedUrl ? (
                    <iframe
                      src={embedUrl}
                      title={video.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="top-video-iframe"
                    />
                  ) : null}

                  {/* Barra de Controles Superiores no Card Ativo */}
                  <div className="video-card-top-controls">
                    <button
                      type="button"
                      onClick={handleToggleSequence}
                      className={`video-ctrl-btn sequence-toggle ${isSequenceActive ? 'active' : ''}`}
                      aria-label={`Sequência de reprodução: ${isSequenceActive ? 'ligada' : 'desligada'}`}
                      title={isSequenceActive ? 'Sequência ligada (toca o próximo automaticamente)' : 'Sequência desligada'}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="17 1 21 5 17 9" />
                        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                        <polyline points="7 23 3 19 7 15" />
                        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                      </svg>
                      <span>{isSequenceActive ? 'Sequência: ligada' : 'Sequência: desligada'}</span>
                    </button>

                    <div className="video-ctrl-right-group">
                      {!isLast && (
                        <button
                          type="button"
                          onClick={() => goToNextVideo(true)}
                          className="video-ctrl-btn next-video-btn"
                          aria-label="Tocar próximo vídeo"
                          title="Tocar próximo vídeo"
                        >
                          <span>Próximo</span>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polygon points="5 4 15 12 5 20 5 4" fill="currentColor" />
                            <line x1="19" y1="5" x2="19" y2="19" />
                          </svg>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={closePlayer}
                        className="video-ctrl-btn close-video-btn"
                        aria-label="Fechar vídeo"
                        title="Fechar vídeo"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Fallback de Autoplay Bloqueado (iOS Safari) */}
                  {needsUserInteraction && (
                    <div className="video-autoplay-blocked-overlay">
                      <button
                        type="button"
                        onClick={handleManualResume}
                        className="video-resume-big-btn"
                        aria-label="Tocar próximo vídeo"
                      >
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <polygon points="6 3 20 12 6 21 6 3" />
                        </svg>
                        <span>Tocar próximo</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  className="top-video-trigger"
                  onClick={() => playVideo(video, false)}
                  aria-label={`Reproduzir vídeo: ${video.title}`}
                >
                  {/* Thumbnail do vídeo */}
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt=""
                      className="top-video-thumb"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : null}

                  {/* Fallback de ícone caso thumbnail falhe */}
                  <div className="top-video-fallback-thumb" aria-hidden="true">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M21.58 7.19a2.7 2.7 0 0 0-1.9-1.9C18 4.8 12 4.8 12 4.8s-6 0-7.68.49a2.7 2.7 0 0 0-1.9 1.9A28.4 28.4 0 0 0 2 12a28.4 28.4 0 0 0 .42 4.81 2.7 2.7 0 0 0 1.9 1.9c1.68.49 7.68.49 7.68.49s6 0 7.68-.49a2.7 2.7 0 0 0 1.9-1.9A28.4 28.4 0 0 0 22 12a28.4 28.4 0 0 0-.42-4.81zM9.75 15.02V8.98l5.5 3.02-5.5 3.02z" />
                    </svg>
                  </div>

                  {/* Overlay gradiente */}
                  <div className="top-video-overlay" aria-hidden="true" />

                  {/* Botão de Play central */}
                  <div className="top-video-play-btn" aria-hidden="true">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="6 3 20 12 6 21 6 3" />
                    </svg>
                  </div>

                  {/* Número de ranking grande no canto (1, 2, 3...) */}
                  <span className="top-video-rank" aria-label={`Posição ${index + 1}`}>
                    {index + 1}
                  </span>

                  {/* Título do vídeo */}
                  <p className="top-video-title">{video.title}</p>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
