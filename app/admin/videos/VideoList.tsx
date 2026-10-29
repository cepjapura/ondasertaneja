'use client';

import React, { useTransition } from 'react';
import { togglePublishVideoAction, deleteVideoAction, reorderVideoAction } from '../actions';

interface VideoItem {
  id: string;
  title: string;
  url: string;
  platform: string;
  thumbnailUrl: string | null;
  isPublished: boolean;
  sortOrder: number;
  createdAt: Date;
}

interface Props {
  videos: VideoItem[];
}

export default function VideoList({ videos }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = (id: string) => {
    startTransition(async () => {
      try {
        await togglePublishVideoAction(id);
      } catch (err: any) {
        alert(err.message || 'Erro ao alterar status.');
      }
    });
  };

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`Deseja realmente excluir o vídeo "${title}"?`)) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteVideoAction(id);
      } catch (err: any) {
        alert(err.message || 'Erro ao excluir vídeo.');
      }
    });
  };

  const handleReorder = (id: string, direction: 'up' | 'down') => {
    startTransition(async () => {
      try {
        await reorderVideoAction(id, direction);
      } catch (err: any) {
        alert(err.message || 'Erro ao reordenar vídeo.');
      }
    });
  };

  if (!videos || videos.length === 0) {
    return (
      <section className="admin-card">
        <div className="admin-empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
          <h3>Nenhum vídeo cadastrado</h3>
          <p>Utilize o formulário acima para cadastrar o primeiro vídeo curto da plataforma.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-card" aria-label="Lista de vídeos cadastrados">
      <div className="admin-card-header">
        <h2 className="admin-card-title">Vídeos Cadastrados ({videos.length})</h2>
        <p className="admin-card-subtitle">
          Gerencie a ordem de exibição, publique ou oculte vídeos do carrossel da home.
        </p>
      </div>

      <div className="admin-table-responsive">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>Ordem</th>
              <th style={{ width: '90px' }}>Capa</th>
              <th>Título & Plataforma</th>
              <th style={{ width: '130px' }}>Status</th>
              <th style={{ width: '220px', textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((video, index) => {
              const isFirst = index === 0;
              const isLast = index === videos.length - 1;

              // Thumbnail
              let thumb = video.thumbnailUrl;
              if (!thumb && video.platform === 'tiktok') {
                thumb = `/api/proxy-thumbnail?id=${video.id}`;
              }

              return (
                <tr key={video.id} className={!video.isPublished ? 'admin-row-draft' : ''}>
                  {/* Ordem & Botões de Subir / Descer */}
                  <td>
                    <div className="admin-order-controls">
                      <span className="admin-order-num">{video.sortOrder}</span>
                      <div className="admin-order-btns">
                        <button
                          type="button"
                          disabled={isFirst || isPending}
                          onClick={() => handleReorder(video.id, 'up')}
                          className="admin-btn-icon"
                          title="Subir posição"
                          aria-label={`Mover "${video.title}" para cima`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="18 15 12 9 6 15" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          disabled={isLast || isPending}
                          onClick={() => handleReorder(video.id, 'down')}
                          className="admin-btn-icon"
                          title="Descer posição"
                          aria-label={`Mover "${video.title}" para baixo`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </td>

                  {/* Capa */}
                  <td>
                    <div className="admin-video-thumb">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt=""
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : null}
                      <span className="admin-thumb-fallback" aria-hidden="true">
                        {video.platform === 'youtube' && 'YT'}
                        {video.platform === 'tiktok' && 'TT'}
                        {video.platform === 'instagram' && 'IG'}
                      </span>
                    </div>
                  </td>

                  {/* Título & Plataforma */}
                  <td>
                    <div className="admin-video-meta">
                      <div className="admin-video-title-wrap">
                        <span className="admin-video-title">{video.title}</span>
                        <a
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-video-link"
                          title="Abrir link original"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </a>
                      </div>
                      <div className="admin-badges">
                        <span className={`admin-platform-badge ${video.platform}`}>
                          {video.platform === 'youtube' ? 'YouTube Shorts' : video.platform === 'tiktok' ? 'TikTok' : 'Instagram Reels'}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td>
                    {video.isPublished ? (
                      <span className="admin-status-badge published">
                        <span className="admin-status-dot published" />
                        <span>Publicado</span>
                      </span>
                    ) : (
                      <span className="admin-status-badge draft">
                        <span className="admin-status-dot draft" />
                        <span>Rascunho</span>
                      </span>
                    )}
                  </td>

                  {/* Ações */}
                  <td style={{ textAlign: 'right' }}>
                    <div className="admin-actions-cell">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleToggle(video.id)}
                        className={`admin-btn-action ${video.isPublished ? 'unpublish' : 'publish'}`}
                      >
                        {video.isPublished ? 'Despublicar' : 'Publicar'}
                      </button>

                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleDelete(video.id, video.title)}
                        className="admin-btn-action delete"
                        title="Excluir vídeo"
                        aria-label={`Excluir vídeo: ${video.title}`}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
