'use client';

import React from 'react';
import { useAudio } from '@/contexts/AudioContext';

interface Props {
  initialIsAvailable?: boolean;
}

export default function HomeRadioCard({ initialIsAvailable }: Props) {
  const { isConfigLoaded, isAvailable: contextIsAvailable, isPlaying, togglePlay, trackInfo, hasError } = useAudio();

  // Usa initialIsAvailable durante o SSR/hidratação e atualiza dinamicamente após carregar o contexto
  const isAvailable = isConfigLoaded ? contextIsAvailable : (initialIsAvailable ?? false);

  return (
    <div className="home-radio-wrapper">
      {/* Título Principal */}
      <h1 className="home-title">
        A batida que move o <span className="home-title-accent">Brasil.</span>
      </h1>
      <p className="home-subtitle">
        Rádio, lançamentos e agenda. Tudo num toque.
      </p>

      {/* Card da Rádio (Fundo escuro fixo #17140F em ambos os modos) */}
      <div className="home-radio-card" aria-label="Player de Rádio ao Vivo">
        {/* Topo do Card: Selo (AO VIVO / EM BREVE) e Equalizador */}
        <div className="home-radio-top">
          <div className="home-radio-badge">
            <span
              className="home-radio-dot"
              style={{
                backgroundColor: !isAvailable ? '#B8AF9F' : isPlaying ? '#25D366' : '#FF5A4F',
                boxShadow: !isAvailable
                  ? 'none'
                  : isPlaying
                  ? '0 0 8px #25D366'
                  : '0 0 8px #FF5A4F',
              }}
            />
            <span className="home-radio-badge-text">
              {!isAvailable ? 'EM BREVE' : isPlaying ? 'NO AR' : 'AO VIVO'}
            </span>
          </div>

          {/* Barrinhas de equalizador decorativas (só ativas quando a rádio existe) */}
          {isAvailable && (
            <div className="home-radio-eq" aria-hidden="true">
              <span className={`eq-bar ${isPlaying ? 'playing' : ''}`} />
              <span className={`eq-bar ${isPlaying ? 'playing' : ''}`} />
              <span className={`eq-bar ${isPlaying ? 'playing' : ''}`} />
              <span className={`eq-bar ${isPlaying ? 'playing' : ''}`} />
              <span className={`eq-bar ${isPlaying ? 'playing' : ''}`} />
            </div>
          )}
        </div>

        {/* Meio: Capa & Informações da Música / Aviso Em Breve */}
        <div className="home-radio-body">
          <div className="home-radio-cover">
            {isAvailable && trackInfo.coverUrl ? (
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
              {!isAvailable ? 'Rádio Onda Sertaneja 24h' : trackInfo.title || 'Rádio Onda Sertaneja 24h'}
            </h3>
            <p className="home-radio-track-artist">
              {!isAvailable
                ? 'A rádio ao vivo está chegando. Fique ligado!'
                : hasError
                ? 'Transmissão indisponível no momento'
                : trackInfo.artist || 'A batida que move o Brasil'}
            </p>
          </div>

          {/* Botão de Play Redondo de 56px (APENAS se a rádio estiver disponível) */}
          {isAvailable && (
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
          )}
        </div>
      </div>
    </div>
  );
}
