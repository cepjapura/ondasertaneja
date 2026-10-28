'use client';

import React, { useState } from 'react';

export interface ShortVideoItem {
  id: string;
  title: string;
  url: string;
  platform: string; // 'tiktok' | 'instagram' | 'youtube'
  thumbnailUrl?: string | null;
  sortOrder: number;
}

interface Props {
  videos: ShortVideoItem[];
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

export default function ShortVideosCarousel({ videos }: Props) {
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  if (!videos || videos.length === 0) {
    return null;
  }

  const getThumbnail = (video: ShortVideoItem) => {
    if (video.thumbnailUrl) return video.thumbnailUrl;
    if (video.platform === 'youtube') {
      const ytId = extractYouTubeId(video.url);
      if (ytId) return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
    }
    if (video.platform === 'tiktok') {
      return `/api/proxy-thumbnail?id=${video.id}`;
    }
    return null;
  };

  const getEmbedUrl = (video: ShortVideoItem) => {
    if (video.platform === 'youtube') {
      const ytId = extractYouTubeId(video.url);
      return ytId ? `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&playsinline=1` : null;
    }
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

  return (
    <section className="short-videos-section" aria-label="Assista em 30 segundos">
      <div className="section-header-compact">
        <h2 className="section-title-clean">Assista em 30 Segundos</h2>
      </div>

      <div className="short-videos-carousel" role="region" aria-label="Carrossel de vídeos verticais">
        {videos.map((video) => {
          const isActive = activeVideoId === video.id;
          const thumbnail = getThumbnail(video);
          const embedUrl = getEmbedUrl(video);

          return (
            <div key={video.id} className="short-video-card">
              {isActive && embedUrl ? (
                <div className="short-video-iframe-wrapper">
                  <iframe
                    src={embedUrl}
                    title={video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="short-video-iframe"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  className="short-video-trigger"
                  onClick={() => setActiveVideoId(video.id)}
                  aria-label={`Reproduzir vídeo: ${video.title}`}
                >
                  {/* Thumbnail com fallback elegante caso expire ou falhe */}
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt=""
                      className="short-video-thumb"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : null}

                  {/* Fallback de ícone da plataforma */}
                  <div className="short-video-fallback-thumb" aria-hidden="true">
                    {video.platform === 'youtube' && (
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21.58 7.19a2.7 2.7 0 0 0-1.9-1.9C18 4.8 12 4.8 12 4.8s-6 0-7.68.49a2.7 2.7 0 0 0-1.9 1.9A28.4 28.4 0 0 0 2 12a28.4 28.4 0 0 0 .42 4.81 2.7 2.7 0 0 0 1.9 1.9c1.68.49 7.68.49 7.68.49s6 0 7.68-.49a2.7 2.7 0 0 0 1.9-1.9A28.4 28.4 0 0 0 22 12a28.4 28.4 0 0 0-.42-4.81zM9.75 15.02V8.98l5.5 3.02-5.5 3.02z" />
                      </svg>
                    )}
                    {video.platform === 'instagram' && (
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" fill="var(--bg-card)" />
                        <circle cx="17.5" cy="6.5" r="1.5" fill="var(--bg-card)" />
                      </svg>
                    )}
                    {video.platform === 'tiktok' && (
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.86.12V9.42a6.34 6.34 0 0 0-.86-.06 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V7.57a8.16 8.16 0 0 0 4.63 1.45V5.57a4.83 4.83 0 0 1-.86-2.88z" />
                      </svg>
                    )}
                  </div>

                  {/* Gradient overlay */}
                  <div className="short-video-overlay" aria-hidden="true" />

                  {/* Play Button Icon */}
                  <div className="short-video-play-btn" aria-hidden="true">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="6 3 20 12 6 21 6 3" />
                    </svg>
                  </div>

                  {/* Platform Badge */}
                  <span className="short-video-platform-badge">
                    {video.platform === 'youtube' ? 'Shorts' : video.platform === 'instagram' ? 'Reels' : 'TikTok'}
                  </span>

                  {/* Title */}
                  <p className="short-video-title">{video.title}</p>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
