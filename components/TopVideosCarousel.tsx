'use client';

import React, { useState } from 'react';

export interface TopVideoItem {
  id: string;
  title: string;
  url: string;
  platform: string;
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

export default function TopVideosCarousel({ videos }: Props) {
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  if (!videos || videos.length === 0) {
    return null;
  }

  const getThumbnail = (video: TopVideoItem) => {
    if (video.thumbnailUrl) return video.thumbnailUrl;
    const ytId = extractYouTubeId(video.url);
    if (ytId) return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
    return null;
  };

  const getEmbedUrl = (video: TopVideoItem) => {
    const ytId = extractYouTubeId(video.url);
    if (ytId) {
      return `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&playsinline=1`;
    }
    return video.url;
  };

  return (
    <section className="top-videos-section" aria-label="Top Vídeos">
      <div className="section-header-compact">
        <h2 className="section-title-clean">Top Vídeos</h2>
      </div>

      <div className="top-videos-carousel" role="region" aria-label="Carrossel de clipes musicais">
        {videos.map((video) => {
          const isActive = activeVideoId === video.id;
          const thumbnail = getThumbnail(video);
          const embedUrl = getEmbedUrl(video);

          return (
            <div key={video.id} className="top-video-card">
              {isActive && embedUrl ? (
                <div className="top-video-iframe-wrapper">
                  <iframe
                    src={embedUrl}
                    title={video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="top-video-iframe"
                    loading="lazy"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  className="top-video-trigger"
                  onClick={() => setActiveVideoId(video.id)}
                  aria-label={`Assistir clipe: ${video.title}`}
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
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M21.58 7.19a2.7 2.7 0 0 0-1.9-1.9C18 4.8 12 4.8 12 4.8s-6 0-7.68.49a2.7 2.7 0 0 0-1.9 1.9A28.4 28.4 0 0 0 2 12a28.4 28.4 0 0 0 .42 4.81 2.7 2.7 0 0 0 1.9 1.9c1.68.49 7.68.49 7.68.49s6 0 7.68-.49a2.7 2.7 0 0 0 1.9-1.9A28.4 28.4 0 0 0 22 12a28.4 28.4 0 0 0-.42-4.81zM9.75 15.02V8.98l5.5 3.02-5.5 3.02z" />
                    </svg>
                  </div>

                  {/* Overlay gradiente */}
                  <div className="top-video-overlay" aria-hidden="true" />

                  {/* Botão de Play central */}
                  <div className="top-video-play-btn" aria-hidden="true">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="6 3 20 12 6 21 6 3" />
                    </svg>
                  </div>

                  {/* Etiqueta CLIPE */}
                  <span className="top-video-badge">CLIPE</span>

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
