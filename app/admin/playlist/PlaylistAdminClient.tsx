'use client';

import React, { useState, useTransition } from 'react';
import Image from 'next/image';
import { formatSubscriberCount } from '@/lib/youtube';
import {
  addChannelAction,
  toggleChannelAction,
  deleteChannelAction,
  updatePlaylistModeAction,
  removeItemFromDraftAction,
  restoreItemToDraftAction,
  approveDraftAction,
  manualSyncAction,
} from './actions';

export interface DiscardCounts {
  outOfWindow: number;
  isShortOrVertical: number;
  under60s: number;
  over10m: number;
  notMusicCategory: number;
  liveOrPremiere: number;
  notEmbeddable: number;
  blockedTitle: number;
  duplicate: number;
  channelLimit: number;
  inTopVideos: number;
}

export interface SyncAuditStats {
  totalRead: number;
  selected: number;
  windowDays: number;
  quotaCost: number;
  discards: DiscardCounts;
}

interface Channel {
  id: string;
  channelId: string;
  channelTitle: string;
  channelUrl: string;
  avatarUrl: string | null;
  subscriberCount?: string | null;
  isVerified?: boolean;
  isActive: boolean;
  createdAt: Date;
}

interface PlaylistItem {
  id: string;
  youtubeVideoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  durationSeconds: number;
  isRemoved: boolean;
  sortOrder: number;
}

interface Playlist {
  id: string;
  weekIdentifier: string;
  title: string;
  status: string;
  mode: string;
  windowDays?: number;
  autoPublishAt: Date | null;
  generatedAt: Date;
  publishedAt: Date | null;
  items: PlaylistItem[];
}

interface SyncLog {
  id: string;
  status: string;
  trigger: string;
  weekIdentifier: string | null;
  videosFound: number;
  videosSelected: number;
  message: string | null;
  executedAt: Date;
}

interface Props {
  channels: Channel[];
  publishedPlaylist: Playlist | null;
  draftPlaylist: Playlist | null;
  mode: 'MANUAL_REVIEW' | 'AUTO';
  lastLog: SyncLog | null;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function PlaylistAdminClient({
  channels,
  publishedPlaylist,
  draftPlaylist,
  mode: initialMode,
  lastLog,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<'MANUAL_REVIEW' | 'AUTO'>(initialMode);
  const [channelInput, setChannelInput] = useState('');
  const [channelError, setChannelError] = useState<string | null>(null);
  const [syncStats, setSyncStats] = useState<SyncAuditStats | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleAddChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelInput.trim()) return;

    setFeedback(null);
    setChannelError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set('channelUrlOrHandle', channelInput.trim());
      const res = await addChannelAction(formData);
      if (res.ok) {
        setChannelInput('');
        setChannelError(null);
        setFeedback({ type: 'success', message: 'Canal cadastrado com sucesso!' });
      } else {
        const errorMsg = res.error || 'Erro ao cadastrar canal.';
        setChannelError(errorMsg);
        setFeedback({ type: 'error', message: errorMsg });
      }
    });
  };

  const handleToggleChannel = (channelId: string) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await toggleChannelAction(channelId);
      if (!res.ok) {
        setFeedback({ type: 'error', message: res.error || 'Erro ao alternar status do canal.' });
      }
    });
  };

  const handleDeleteChannel = (channelId: string, title: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o canal "${title}"?`)) return;

    setFeedback(null);
    startTransition(async () => {
      const res = await deleteChannelAction(channelId);
      if (!res.ok) {
        setFeedback({ type: 'error', message: res.error || 'Erro ao excluir canal.' });
      } else {
        setFeedback({ type: 'success', message: `Canal "${title}" excluído.` });
      }
    });
  };

  const handleModeChange = (newMode: 'MANUAL_REVIEW' | 'AUTO') => {
    setMode(newMode);
    setFeedback(null);
    startTransition(async () => {
      const res = await updatePlaylistModeAction(newMode);
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: `Modo de aprovação atualizado para: ${newMode === 'AUTO' ? 'Automático' : 'Com Aprovação'}.`,
        });
      } else {
        setFeedback({ type: 'error', message: res.error || 'Erro ao atualizar modo.' });
      }
    });
  };

  const handleManualSync = () => {
    if (!window.confirm('Deseja iniciar a sincronização semanal da playlist agora?')) return;

    setFeedback(null);
    startTransition(async () => {
      const res = await manualSyncAction();
      if (res.stats) {
        setSyncStats(res.stats as SyncAuditStats);
      }
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: res.message || 'Sincronização concluída com sucesso!',
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.message || 'Falha ao sincronizar playlist.',
        });
      }
    });
  };

  const handleRemoveItem = (itemId: string) => {
    startTransition(async () => {
      await removeItemFromDraftAction(itemId);
    });
  };

  const handleRestoreItem = (itemId: string) => {
    startTransition(async () => {
      await restoreItemToDraftAction(itemId);
    });
  };

  const handleApproveDraft = (playlistId: string) => {
    if (!window.confirm('Deseja aprovar e publicar esta playlist semanal no ar imediatamente?')) return;

    setFeedback(null);
    startTransition(async () => {
      const res = await approveDraftAction(playlistId);
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Playlist semanal publicada no ar com sucesso!' });
      } else {
        setFeedback({ type: 'error', message: res.error || 'Erro ao aprovar playlist.' });
      }
    });
  };

  const activeDraftItems = draftPlaylist?.items.filter(i => !i.isRemoved) || [];
  const removedDraftItems = draftPlaylist?.items.filter(i => i.isRemoved) || [];

  return (
    <div className="admin-playlist-container">
      {/* Barra de Notificações e Feedback */}
      {feedback && (
        <div className={`admin-alert ${feedback.type === 'success' ? 'admin-alert-success' : 'admin-alert-error'}`}>
          <span>{feedback.message}</span>
          <button type="button" onClick={() => setFeedback(null)} className="admin-alert-close">×</button>
        </div>
      )}

      {/* Raio-X da Execução */}
      {(syncStats || lastLog?.message?.includes('📊 Raio-X')) && (
        <div className="admin-card" style={{ borderLeft: '4px solid #3b82f6', background: 'rgba(59, 130, 246, 0.03)', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📊 Raio-X da Execução
              {syncStats && (
                <span className="admin-badge" style={{ background: '#3b82f6', color: '#fff' }}>
                  {syncStats.selected} selecionados • Janela de {syncStats.windowDays} dias
                </span>
              )}
            </h4>
            {syncStats && (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Cota da API gasta: <strong>{syncStats.quotaCost} unidades</strong> • Lidos: <strong>{syncStats.totalRead}</strong>
              </span>
            )}
          </div>

          {syncStats ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '10px', fontSize: '0.85rem' }}>
              <div style={{ padding: '8px 12px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Fora da janela:</span> <strong>{syncStats.discards.outOfWindow}</strong>
              </div>
              <div style={{ padding: '8px 12px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Short (vertical ou #shorts):</span> <strong>{syncStats.discards.isShortOrVertical}</strong>
              </div>
              <div style={{ padding: '8px 12px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Menos de 60s:</span> <strong>{syncStats.discards.under60s}</strong>
              </div>
              <div style={{ padding: '8px 12px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Mais de 10 min:</span> <strong>{syncStats.discards.over10m}</strong>
              </div>
              <div style={{ padding: '8px 12px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Categoria ≠ Música:</span> <strong>{syncStats.discards.notMusicCategory}</strong>
              </div>
              <div style={{ padding: '8px 12px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Live/estreia:</span> <strong>{syncStats.discards.liveOrPremiere}</strong>
              </div>
              <div style={{ padding: '8px 12px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Não incorporável:</span> <strong>{syncStats.discards.notEmbeddable}</strong>
              </div>
              <div style={{ padding: '8px 12px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Título bloqueado:</span> <strong>{syncStats.discards.blockedTitle}</strong>
              </div>
              <div style={{ padding: '8px 12px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Repetido:</span> <strong>{syncStats.discards.duplicate}</strong>
              </div>
              <div style={{ padding: '8px 12px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Limite por canal:</span> <strong>{syncStats.discards.channelLimit}</strong>
              </div>
              <div style={{ padding: '8px 12px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Já está em Top Vídeos:</span> <strong>{syncStats.discards.inTopVideos}</strong>
              </div>
            </div>
          ) : (
            <pre style={{ margin: 0, fontSize: '0.85rem', whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: 'var(--text-muted)' }}>
              {lastLog?.message}
            </pre>
          )}
        </div>
      )}

      {/* Alerta de erro na última sincronização */}
      {lastLog?.status === 'FAILED' && (
        <div className="admin-alert admin-alert-error">
          <div>
            <strong>⚠️ Falha na última sincronização ({new Date(lastLog.executedAt).toLocaleString('pt-BR')}):</strong>
            <p style={{ margin: '4px 0 0 0' }}>{lastLog.message}</p>
          </div>
        </div>
      )}

      {/* Topo: Ações Globais */}
      <div className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px 0' }}>
              Motor de Automação da Playlist Semanal
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
              Os lançamentos são lidos automaticamente toda segunda às 04h (Brasília). A cota da API é otimizada (~26 unidades/execução).
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isPending}
              className="admin-btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              {isPending ? (
                <>
                  <span className="admin-spinner" aria-hidden="true" />
                  <span>Sincronizando...</span>
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  <span>Gerar Agora</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Configuração do Modo de Aprovação */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Modo de Publicação:</span>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
            <input
              type="radio"
              name="approvalMode"
              checked={mode === 'MANUAL_REVIEW'}
              onChange={() => handleModeChange('MANUAL_REVIEW')}
              disabled={isPending}
            />
            <strong>Com Aprovação (Padrão)</strong> — Gera rascunho para revisão e auto-publica após 48h.
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
            <input
              type="radio"
              name="approvalMode"
              checked={mode === 'AUTO'}
              onChange={() => handleModeChange('AUTO')}
              disabled={isPending}
            />
            <strong>Automático</strong> — Publica imediatamente ao concluir a leitura da segunda-feira.
          </label>
        </div>
      </div>

      {/* RASCUNHO PENDENTE DE APROVAÇÃO */}
      {draftPlaylist && (
        <div className="admin-card" style={{ border: '2px solid #E67E22', background: 'rgba(230, 126, 34, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="admin-badge" style={{ background: '#E67E22', color: '#FFF' }}>RASCUNHO PENDENTE</span>
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Semana {draftPlaylist.weekIdentifier}</h3>
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {activeDraftItems.length} músicas ativas {draftPlaylist.windowDays ? `(janela de ${draftPlaylist.windowDays} dias)` : ''}.
                {draftPlaylist.autoPublishAt && (
                  <> Auto-publicação em: <strong>{new Date(draftPlaylist.autoPublishAt).toLocaleString('pt-BR')}</strong> (em 48h após a geração).</>
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleApproveDraft(draftPlaylist.id)}
              disabled={isPending || activeDraftItems.length === 0}
              className="admin-btn-primary"
              style={{ padding: '10px 20px', fontSize: '0.95rem', fontWeight: 700 }}
            >
              ✓ Aprovar e Publicar no Ar
            </button>
          </div>

          {/* Grid de Vídeos do Rascunho */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', marginTop: '16px' }}>
            {draftPlaylist.items.map((item, index) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '10px',
                  borderRadius: '10px',
                  background: item.isRemoved ? 'rgba(255, 255, 255, 0.02)' : 'var(--bg-card)',
                  border: item.isRemoved ? '1px dashed var(--border-color)' : '1px solid var(--border-color)',
                  opacity: item.isRemoved ? 0.5 : 1,
                  alignItems: 'center',
                }}
              >
                {item.thumbnailUrl && (
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    style={{ width: '80px', height: '48px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.title}>
                    #{index + 1} {item.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {item.channelTitle} • {formatDuration(item.durationSeconds)}
                  </div>
                </div>

                {item.isRemoved ? (
                  <button
                    type="button"
                    onClick={() => handleRestoreItem(item.id)}
                    title="Restaurar vídeo para a playlist"
                    style={{ background: 'none', border: 'none', color: '#25D366', cursor: 'pointer', fontSize: '1rem', padding: '6px' }}
                  >
                    ↩
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    title="Remover vídeo do rascunho"
                    style={{ background: 'none', border: 'none', color: '#FF5A4F', cursor: 'pointer', fontSize: '1.1rem', padding: '6px' }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PLAYLIST ATUALMENTE NO AR */}
      <div className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Playlist Publicada no Ar</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {publishedPlaylist
                ? `Semana ${publishedPlaylist.weekIdentifier} • Publicada em ${publishedPlaylist.publishedAt ? new Date(publishedPlaylist.publishedAt).toLocaleString('pt-BR') : 'Data n/d'} • ${publishedPlaylist.items.length} músicas no player`
                : 'Nenhuma playlist semanal publicada no momento (o card da Home usa a playlist manual das Configurações ou "EM BREVE").'}
            </p>
          </div>
          {publishedPlaylist && (
            <span className="admin-badge" style={{ background: '#25D366', color: '#000' }}>NO AR</span>
          )}
        </div>

        {publishedPlaylist && publishedPlaylist.items.length > 0 && (
          <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 12px' }}>
            <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem' }}>
              {publishedPlaylist.items.map((item) => (
                <li key={item.id} style={{ margin: '6px 0' }}>
                  <strong>{item.title}</strong> — <span style={{ color: 'var(--text-muted)' }}>{item.channelTitle} ({formatDuration(item.durationSeconds)})</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* CANAIS OFICIAIS CADASTRADOS */}
      <div className="admin-card">
        <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem' }}>Canais Oficiais do YouTube</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
          Cadastre os canais de artistas ou gravadoras que devem ser varridos semanalmente.
        </p>

        {/* Formulário de Adicionar Canal */}
        <form onSubmit={handleAddChannel} style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="admin-input"
              style={{ flex: 1, minWidth: '300px' }}
              placeholder="Cole o link ou @handle (ex.: https://www.youtube.com/@GusttavoLimaOficial)"
              value={channelInput}
              onChange={(e) => {
                setChannelInput(e.target.value);
                if (channelError) setChannelError(null);
              }}
              disabled={isPending}
            />
            <button type="submit" disabled={isPending || !channelInput.trim()} className="admin-btn-primary">
              + Cadastrar Canal
            </button>
          </div>
          {channelError && (
            <div style={{ marginTop: '8px', color: '#ef4444', fontSize: '0.875rem', fontWeight: 500 }}>
              {channelError}
            </div>
          )}
        </form>

        {/* Tabela de Canais */}
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '48px' }}>Avatar</th>
                <th>Canal</th>
                <th>ID do Canal</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {channels.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    Nenhum canal oficial cadastrado ainda. Adicione o primeiro canal acima.
                  </td>
                </tr>
              ) : (
                channels.map((ch) => (
                  <tr key={ch.id} style={{ opacity: ch.isActive ? 1 : 0.6 }}>
                    <td>
                      {ch.avatarUrl ? (
                        <img
                          src={ch.avatarUrl}
                          alt={ch.channelTitle}
                          style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--border-color)' }} />
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <strong>{ch.channelTitle}</strong>
                        {ch.isVerified ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.75rem',
                              color: '#3b82f6',
                              background: 'rgba(59, 130, 246, 0.1)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 600,
                            }}
                            title="Canal Verificado"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                            Verificado
                          </span>
                        ) : ch.subscriberCount ? (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-muted)',
                              background: 'rgba(255, 255, 255, 0.06)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color)',
                            }}
                            title={`${parseInt(ch.subscriberCount, 10).toLocaleString('pt-BR')} inscritos`}
                          >
                            {formatSubscriberCount(ch.subscriberCount)}
                          </span>
                        ) : null}
                      </div>
                      <div style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                        <a href={ch.channelUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-text)' }}>
                          Acessar canal ↗
                        </a>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      {ch.channelId}
                    </td>
                    <td>
                      <span className={`admin-badge ${ch.isActive ? 'admin-badge-published' : 'admin-badge-draft'}`}>
                        {ch.isActive ? 'ATIVO' : 'INATIVO'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleChannel(ch.id)}
                          disabled={isPending}
                          className="admin-btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                        >
                          {ch.isActive ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteChannel(ch.id, ch.channelTitle)}
                          disabled={isPending}
                          className="admin-btn-delete"
                          style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
