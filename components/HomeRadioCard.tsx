'use client';

import React, { useState, useEffect } from 'react';
import { useAudio } from '@/contexts/AudioContext';
import { getPlaylistEmbedUrl } from '@/lib/playlist';
import HomeSponsorBanner from '@/components/HomeSponsorBanner';

interface Props {
  initialIsAvailable?: boolean;
  initialPlaylistEmbedUrl?: string | null;
  initialPlaylistUrl?: string | null;
  sponsorUrl?: string | null;
}

export default function HomeRadioCard({
  initialIsAvailable,
  initialPlaylistEmbedUrl,
  initialPlaylistUrl,
  sponsorUrl,
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
  const [showIframe, setShowIframe] = useState(false);

  // Atualização dinâmica via /api/config
  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
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

  useEffect(() => {
    const handleStopMedia = (e: any) => {
      if (e?.detail?.origin !== 'playlist') {
        setShowIframe(false);
      }
    };
    window.addEventListener('onda-stop-media', handleStopMedia);
    return () => {
      window.removeEventListener('onda-stop-media', handleStopMedia);
    };
  }, []);

  const handleClosePlaylist = () => {
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
                    Playlist da Onda
                  </h3>
                  <p className="home-radio-track-artist">
                    Enquanto a rádio não chega, aperta o play!
                  </p>
                </div>

                {/* Botão Ouvir playlist com área de toque mínima de 44px */}
                <button
                  type="button"
                  className="home-radio-playlist-btn"
                  onClick={handleOpenPlaylist}
                  aria-label="Ouvir playlist da Onda"
                  title="Ouvir playlist"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  <span>Ouvir playlist</span>
                </button>
              </div>
            ) : (
              // O iframe só carrega depois do toque, sem autoplay, dentro do card, altura celular 390px
              <div className="home-playlist-iframe-container">
                <iframe
                  className="home-playlist-iframe"
                  src={playlistEmbedUrl || ''}
                  title="Playlist da Onda"
                  loading="lazy"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                />
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
