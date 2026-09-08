'use client';

import { useState, useEffect } from 'react';

interface EventHeroCoverProps {
  src: string;
  alt: string;
}

export function EventHeroCover({ src, alt }: EventHeroCoverProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  useEffect(() => {
    if (!src || !src.trim()) {
      setStatus('error');
      return;
    }

    let isMounted = true;
    const img = new Image();
    img.src = src;

    img.onload = () => {
      if (isMounted) setStatus('loaded');
    };

    img.onerror = () => {
      if (isMounted) setStatus('error');
    };

    return () => {
      isMounted = false;
    };
  }, [src]);

  // Se a imagem estiver carregando ou falhar no precarregamento, NÃO renderizar o container nem a tag img
  if (status !== 'loaded') {
    return null;
  }

  return (
    <div style={{ width: '100%', height: '280px', overflow: 'hidden', position: 'relative', background: '#0a0c10' }}>
      <img
        src={src}
        alt={alt}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(0deg, rgba(30,30,30,1) 0%, rgba(30,30,30,0.25) 70%)',
        }}
      ></div>
    </div>
  );
}

interface ArtistAvatarProps {
  src: string | null;
  alt: string;
}

export function ArtistAvatar({ src, alt }: ArtistAvatarProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  useEffect(() => {
    if (!src || !src.trim()) {
      setStatus('error');
      return;
    }

    let isMounted = true;
    const img = new Image();
    img.src = src;

    img.onload = () => {
      if (isMounted) setStatus('loaded');
    };

    img.onerror = () => {
      if (isMounted) setStatus('error');
    };

    return () => {
      isMounted = false;
    };
  }, [src]);

  if (status === 'loaded' && src) {
    return (
      <img
        src={src}
        alt={alt}
        style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }

  // Apresentação vetorial quando não há imagem válida ou se a imagem falhar
  return (
    <div
      style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--primary)',
        fontSize: '1.1rem',
        flexShrink: 0,
      }}
    >
      <i className="fa-solid fa-microphone-lines"></i>
    </div>
  );
}

interface NewsCardCoverProps {
  src: string;
  alt: string;
}

export function NewsCardCover({ src, alt }: NewsCardCoverProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  useEffect(() => {
    if (!src || !src.trim()) {
      setStatus('error');
      return;
    }

    let isMounted = true;
    const img = new Image();
    img.src = src;

    img.onload = () => {
      if (isMounted) setStatus('loaded');
    };

    img.onerror = () => {
      if (isMounted) setStatus('error');
    };

    return () => {
      isMounted = false;
    };
  }, [src]);

  if (status !== 'loaded') {
    return null;
  }

  return (
    <div style={{ height: '180px', width: '100%', overflow: 'hidden', background: '#0a0c10' }}>
      <img
        src={src}
        alt={alt}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  );
}
