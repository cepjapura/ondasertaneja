'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { isRadioAvailable } from '@/lib/radio';

interface TrackInfo {
  title: string;
  artist: string;
  coverUrl?: string;
}

interface AudioContextType {
  isConfigLoaded: boolean;
  isAvailable: boolean;
  isPlaying: boolean;
  togglePlay: () => void;
  streamUrl: string;
  volume: number;
  isMuted: boolean;
  hasError: boolean;
  handleVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  toggleMute: () => void;
  trackInfo: TrackInfo;
}

const AudioContext = createContext<AudioContextType | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [streamUrl, setStreamUrl] = useState('');
  const [isAvailable, setIsAvailable] = useState(false);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [trackInfo, setTrackInfo] = useState<TrackInfo>({
    title: 'Rádio Onda Sertaneja 24h',
    artist: 'A batida que move o Brasil',
    coverUrl: '',
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        const rawUrl = data?.streamAudioUrl || '';
        const available = isRadioAvailable(rawUrl);
        setIsAvailable(available);
        if (available) {
          setStreamUrl(rawUrl);
        } else {
          setStreamUrl('');
          setIsPlaying(false);
        }
        setIsConfigLoaded(true);
      })
      .catch(err => {
        console.error('Erro ao carregar URL do player:', err);
        setIsAvailable(false);
        setIsConfigLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (!isAvailable || !audioRef.current) return;

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
    <AudioContext.Provider
      value={{
        isConfigLoaded,
        isAvailable,
        isPlaying,
        togglePlay,
        streamUrl,
        volume,
        isMuted,
        hasError,
        handleVolumeChange,
        toggleMute,
        trackInfo,
      }}
    >
      {/* Elemento de áudio único da aplicação (somente quando a rádio estiver disponível) */}
      {isAvailable && streamUrl && (
        <audio
          ref={audioRef}
          src={streamUrl}
          preload="none"
          onError={() => {
            setHasError(true);
            setIsPlaying(false);
          }}
        />
      )}
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const ctx = useContext(AudioContext);
  if (!ctx) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return ctx;
}
