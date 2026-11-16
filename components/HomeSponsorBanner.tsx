'use client';

import React from 'react';
import Image from 'next/image';

interface Props {
  sponsorUrl?: string | null;
  isPlaylistOpen?: boolean;
}

const DEBOUNCE_MS = 30 * 60 * 1000; // 30 minutos entre cliques do mesmo navegador
const STORAGE_KEY = 'sponsor_click_mioto_ts';

export default function HomeSponsorBanner({ sponsorUrl, isPlaylistOpen }: Props) {
  const handleClick = () => {
    try {
      // Ignora cliques repetidos do mesmo navegador em menos de 30 minutos
      if (typeof window !== 'undefined' && window.localStorage) {
        const lastClickStr = localStorage.getItem(STORAGE_KEY);
        const now = Date.now();
        if (lastClickStr) {
          const lastClick = parseInt(lastClickStr, 10);
          if (!isNaN(lastClick) && now - lastClick < DEBOUNCE_MS) {
            return;
          }
        }
        localStorage.setItem(STORAGE_KEY, String(now));
      }
    } catch {
      // Fallback silencioso caso localStorage esteja bloqueado
    }

    try {
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([JSON.stringify({ sponsor: 'alessandro-mioto' })], {
          type: 'application/json',
        });
        navigator.sendBeacon('/api/sponsor/click', blob);
      } else {
        fetch('/api/sponsor/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sponsor: 'alessandro-mioto' }),
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Falha silenciosa para não interromper a navegação do usuário
    }
  };

  const imageElement = (
    <Image
      src="/img/sponsors/mioto-2026-v2.png"
      alt="Patrocinador Alessandro Mioto"
      width={800}
      height={478}
      priority
      sizes="(max-width: 899px) 240px, 340px"
      className="home-sponsor-logo"
    />
  );

  return (
    <aside
      className={`home-sponsor-card ${isPlaylistOpen ? 'has-open-playlist' : ''}`}
      aria-label="Oferecimento"
    >
      <span className="home-sponsor-label">OFERECIMENTO</span>

      {sponsorUrl ? (
        <a
          href={sponsorUrl}
          target="_blank"
          rel="sponsored noopener noreferrer"
          onClick={handleClick}
          className="home-sponsor-link"
          aria-label="Acessar patrocinador Alessandro Mioto (abre em nova aba)"
          title="Acessar Alessandro Mioto (abre em nova aba)"
        >
          {imageElement}
        </a>
      ) : (
        <div className="home-sponsor-wrapper">
          {imageElement}
        </div>
      )}
    </aside>
  );
}
