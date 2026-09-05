'use client';

import React, { useState, useEffect, useRef } from 'react';

export default function PlayerBar() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [streamUrl, setStreamUrl] = useState('https://stream.ondasertaneja.com.br/live');
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.streamAudioUrl && data.streamAudioUrl !== 'https://SEU_STREAM_AQUI') {
          setStreamUrl(data.streamAudioUrl);
        }
      })
      .catch(err => console.error('Erro ao carregar URL do player:', err));
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (!isPlaying) {
      setHasError(false);
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          console.error('Erro de reprodução de áudio:', err);
          setHasError(true);
          setIsPlaying(false);
        });
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (newVol > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <>
      {/* Player Sticky Fixo no Rodapé */}
      <aside
        aria-label="Player de Rádio ao Vivo"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9990,
          background: 'rgba(18, 20, 26, 0.95)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(255, 85, 0, 0.3)',
          boxShadow: '0 -4px 25px rgba(0, 0, 0, 0.6)',
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
          transition: 'all 0.3s ease',
        }}
      >
        {/* Esquerda: Indicador AO VIVO & Informações */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '220px' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: isPlaying ? '#25D366' : 'var(--primary)',
              boxShadow: isPlaying ? '0 0 12px #25D366' : '0 0 8px var(--primary)',
              animation: isPlaying ? 'pulse 1.5s infinite' : 'none',
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  letterSpacing: '1px',
                  background: 'var(--primary)',
                  color: '#fff',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                }}
              >
                {isPlaying ? 'NO AR' : 'AO VIVO'}
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Rádio Onda Sertaneja 24h
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
              {hasError ? '⚠️ Transmissão indisponível no momento' : 'A batida que move o Brasil'}
            </span>
          </div>
        </div>

        {/* Centro: Controles de Reprodução */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={togglePlay}
            style={{
              background: 'linear-gradient(135deg, var(--primary) 0%, #ff7700 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '30px',
              padding: '10px 24px',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 4px 15px rgba(255, 85, 0, 0.4)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
          >
            <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
            <span>{isPlaying ? 'Pausar Rádio' : 'Ouvir Rádio ao Vivo'}</span>
          </button>
        </div>

        {/* Direita: Controles de Volume */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '160px', justifyContent: 'flex-end' }}>
          <button
            onClick={toggleMute}
            style={{
              background: 'transparent',
              border: 'none',
              color: isMuted ? 'var(--primary)' : 'var(--text-muted)',
              fontSize: '1rem',
              cursor: 'pointer',
              padding: '4px',
            }}
            title={isMuted ? 'Desmutar' : 'Mutar'}
          >
            <i className={`fa-solid ${isMuted || volume === 0 ? 'fa-volume-xmark' : volume < 0.5 ? 'fa-volume-low' : 'fa-volume-high'}`}></i>
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            style={{
              width: '90px',
              accentColor: 'var(--primary)',
              cursor: 'pointer',
            }}
          />
        </div>
      </aside>

      <audio
        ref={audioRef}
        src={streamUrl}
        preload="none"
        onError={() => setHasError(true)}
      />
    </>
  );
}
