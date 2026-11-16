'use client';

import React from 'react';
import Image from 'next/image';

interface Props {
  sponsorUrl?: string | null;
}

export default function HomeSponsorBanner({ sponsorUrl }: Props) {
  const handleClick = () => {
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
      src="/img/sponsors/mioto.png"
      alt="Patrocinador Alessandro Mioto"
      width={1024}
      height={612}
      priority
      sizes="(max-width: 640px) 80vw, 360px"
      className="home-sponsor-logo"
    />
  );

  return (
    <section className="home-sponsor-strip" aria-label="Oferecimento">
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
    </section>
  );
}
