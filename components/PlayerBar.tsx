'use client';

import React from 'react';
import { useAudio } from '@/contexts/AudioContext';

export default function PlayerBar() {
  const {
    isAvailable,
    isPlaying,
    togglePlay,
    volume,
    isMuted,
    hasError,
    handleVolumeChange,
    toggleMute,
    trackInfo,
  } = useAudio();

  // Se a rádio não estiver disponível (URL vazia ou placeholder), o PlayerBar fixo NÃO aparece em nenhuma página
  if (!isAvailable) {
    return null;
  }

  return (
    <aside className="player-bar" aria-label="Player de Rádio ao Vivo">
      {/* Esquerda: Indicador AO VIVO & Informações da Faixa */}
      <div className="player-bar-left">
        <div
          className="player-bar-dot"
          style={{
            backgroundColor: isPlaying ? '#25D366' : '#FF5A4F',
            boxShadow: isPlaying ? '0 0 12px #25D366' : '0 0 8px #FF5A4F',
          }}
        />
        <div className="player-bar-info">
          <div className="player-bar-header">
            <span className="player-bar-badge">
              {isPlaying ? 'NO AR' : 'AO VIVO'}
            </span>
            <span className="player-bar-title">
              {trackInfo.title || 'Rádio Onda Sertaneja 24h'}
            </span>
          </div>
          <span className="player-bar-artist">
            {hasError ? 'Transmissão indisponível no momento' : trackInfo.artist || 'A batida que move o Brasil'}
          </span>
        </div>
      </div>

      {/* Centro: Botão de Reprodução */}
      <div className="player-bar-center">
        <button
          type="button"
          className="player-bar-play-btn"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pausar rádio' : 'Tocar rádio ao vivo'}
          title={isPlaying ? 'Pausar Rádio' : 'Ouvir Rádio ao Vivo'}
        >
          {isPlaying ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ marginLeft: '2px' }}>
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
          <span className="player-bar-play-text">
            {isPlaying ? 'Pausar Rádio' : 'Ouvir Rádio ao Vivo'}
          </span>
        </button>
      </div>

      {/* Direita: Controles de Volume (Apenas no computador) */}
      <div className="player-bar-right">
        <button
          type="button"
          onClick={toggleMute}
          className="player-bar-mute-btn"
          aria-label={isMuted ? 'Ativar som' : 'Desativar som'}
          title={isMuted ? 'Desmutar' : 'Mutar'}
        >
          {isMuted || volume === 0 ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          ) : volume < 0.5 ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          )}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          aria-label="Controle de volume da rádio"
          className="player-bar-slider"
        />
      </div>
    </aside>
  );
}
