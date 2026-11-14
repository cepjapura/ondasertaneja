'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import {
  savePlaylistConfigAction,
  saveRadioConfigAction,
  clearConfigFieldAction,
} from '../actions';

interface ConfigFormProps {
  initialStreamUrl: string;
  initialPlaylistUrl: string;
  initialPlaylistEmbedUrl: string;
}

function SubmitPlaylistButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="admin-btn-primary"
      style={{ minHeight: '44px' }}
    >
      {pending ? (
        <>
          <span className="admin-spinner" aria-hidden="true" />
          <span>Salvando Playlist...</span>
        </>
      ) : (
        <>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          <span>Salvar Playlist</span>
        </>
      )}
    </button>
  );
}

function SubmitRadioButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="admin-btn-primary"
      style={{ minHeight: '44px' }}
    >
      {pending ? (
        <>
          <span className="admin-spinner" aria-hidden="true" />
          <span>Salvando Rádio...</span>
        </>
      ) : (
        <>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          <span>Salvar Rádio</span>
        </>
      )}
    </button>
  );
}

export default function ConfigForm({
  initialStreamUrl,
  initialPlaylistUrl,
  initialPlaylistEmbedUrl,
}: ConfigFormProps) {
  // Formulário 1: Playlist da Onda
  const [playlistState, playlistFormAction] = useFormState(savePlaylistConfigAction, null);
  const [playlistUrl, setPlaylistUrl] = useState(initialPlaylistUrl);
  const [playlistClearFeedback, setPlaylistClearFeedback] = useState<string | null>(null);
  const [isPendingPlaylistClear, startPlaylistClear] = useTransition();

  // Formulário 2: Link da Rádio ao Vivo
  const [radioState, radioFormAction] = useFormState(saveRadioConfigAction, null);
  const [streamUrl, setStreamUrl] = useState(initialStreamUrl);
  const [radioClearFeedback, setRadioClearFeedback] = useState<string | null>(null);
  const [isPendingRadioClear, startRadioClear] = useTransition();

  useEffect(() => {
    setPlaylistUrl(initialPlaylistUrl);
  }, [initialPlaylistUrl]);

  useEffect(() => {
    setStreamUrl(initialStreamUrl);
  }, [initialStreamUrl]);

  const handleClearPlaylist = () => {
    if (confirm('Deseja realmente limpar a Playlist da Onda?')) {
      startPlaylistClear(async () => {
        try {
          await clearConfigFieldAction('playlistUrl');
          setPlaylistUrl('');
          setPlaylistClearFeedback('Playlist da Onda desativada e limpa com sucesso!');
        } catch (err: any) {
          alert('Erro ao limpar playlist: ' + err.message);
        }
      });
    }
  };

  const handleClearStream = () => {
    if (confirm('Deseja realmente limpar o link da rádio ao vivo?')) {
      startRadioClear(async () => {
        try {
          await clearConfigFieldAction('streamAudioUrl');
          setStreamUrl('');
          setRadioClearFeedback('Link da rádio ao vivo desativado e limpo com sucesso!');
        } catch (err: any) {
          alert('Erro ao limpar rádio: ' + err.message);
        }
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* ============================================================ */}
      {/* FORMULÁRIO 1: PLAYLIST DA ONDA                               */}
      {/* ============================================================ */}
      <section className="admin-card" aria-label="Formulário da Playlist da Onda">
        <div className="admin-card-header">
          <h2 className="admin-card-title">1. Playlist da Onda</h2>
          <p className="admin-card-subtitle">
            Defina a playlist substituta exibida no card principal da home quando a rádio ao vivo não estiver no ar.
          </p>
        </div>

        {playlistState?.error && (
          <div className="admin-alert admin-alert-error" role="alert" style={{ marginBottom: '20px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{playlistState.error}</span>
          </div>
        )}

        {playlistState?.success && (
          <div className="admin-alert admin-alert-success" role="alert" style={{ marginBottom: '20px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{playlistState.message || 'Playlist da Onda salva e aplicada com sucesso!'}</span>
          </div>
        )}

        {playlistClearFeedback && (
          <div className="admin-alert admin-alert-success" role="alert" style={{ marginBottom: '20px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{playlistClearFeedback}</span>
          </div>
        )}

        <form action={playlistFormAction} className="admin-video-form">
          <div className="admin-form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label htmlFor="playlistUrl" className="admin-form-label" style={{ marginBottom: 0 }}>
                Link da Playlist
              </label>
              {playlistUrl && (
                <button
                  type="button"
                  onClick={handleClearPlaylist}
                  disabled={isPendingPlaylistClear}
                  className="admin-btn-secondary"
                  style={{
                    fontSize: '0.8rem',
                    padding: '4px 10px',
                    color: '#FF5A4F',
                    borderColor: 'rgba(255, 90, 79, 0.3)',
                    cursor: 'pointer',
                    minHeight: '32px',
                  }}
                  title="Limpar campo de Playlist"
                >
                  {isPendingPlaylistClear ? 'Limpando...' : 'Limpar Playlist'}
                </button>
              )}
            </div>

            <input
              id="playlistUrl"
              name="playlistUrl"
              type="text"
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              placeholder="https://open.spotify.com/playlist/... ou https://youtube.com/playlist?list=..."
              className="admin-form-input"
            />
            <span className="admin-form-hint">
              Formatos aceitos <strong>SOMENTE</strong>: <code>open.spotify.com/playlist/&#123;id&#125;</code>, <code>youtube.com/playlist?list=&#123;id&#125;</code> ou <code>music.youtube.com/playlist?list=&#123;id&#125;</code>. Qualquer outro formato será recusado. O embed é montado automaticamente a partir do ID extraído. Deixar vazio remove a playlist.
            </span>
          </div>

          <div className="admin-form-actions" style={{ marginTop: '20px' }}>
            <SubmitPlaylistButton />
          </div>
        </form>
      </section>

      {/* ============================================================ */}
      {/* FORMULÁRIO 2: LINK DA RÁDIO AO VIVO                          */}
      {/* ============================================================ */}
      <section className="admin-card" aria-label="Formulário do Link da Rádio ao Vivo">
        <div className="admin-card-header">
          <h2 className="admin-card-title">2. Link da Rádio ao Vivo</h2>
          <p className="admin-card-subtitle">
            Configure a URL de transmissão (stream HTTPS). Se deixado em branco, o sistema considera "sem rádio" e dá prioridade para a Playlist da Onda.
          </p>
        </div>

        {radioState?.error && (
          <div className="admin-alert admin-alert-error" role="alert" style={{ marginBottom: '20px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{radioState.error}</span>
          </div>
        )}

        {radioState?.success && (
          <div className="admin-alert admin-alert-success" role="alert" style={{ marginBottom: '20px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{radioState.message || 'Configuração da rádio ao vivo salva com sucesso!'}</span>
          </div>
        )}

        {radioClearFeedback && (
          <div className="admin-alert admin-alert-success" role="alert" style={{ marginBottom: '20px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{radioClearFeedback}</span>
          </div>
        )}

        <form action={radioFormAction} className="admin-video-form">
          <div className="admin-form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label htmlFor="streamAudioUrl" className="admin-form-label" style={{ marginBottom: 0 }}>
                Link da rádio ao vivo (streamAudioUrl)
              </label>
              {streamUrl && (
                <button
                  type="button"
                  onClick={handleClearStream}
                  disabled={isPendingRadioClear}
                  className="admin-btn-secondary"
                  style={{
                    fontSize: '0.8rem',
                    padding: '4px 10px',
                    color: '#FF5A4F',
                    borderColor: 'rgba(255, 90, 79, 0.3)',
                    cursor: 'pointer',
                    minHeight: '32px',
                  }}
                  title="Limpar campo de link da rádio"
                >
                  {isPendingRadioClear ? 'Limpando...' : 'Limpar Rádio'}
                </button>
              )}
            </div>

            <input
              id="streamAudioUrl"
              name="streamAudioUrl"
              type="text"
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder="Vazio (sem rádio) ou https://suaradio.com.br:8000/live"
              className="admin-form-input"
            />
            <span className="admin-form-hint">
              <strong>Campo vazio significa "sem rádio"</strong> e salva sem erro. Caso preenchido, deve ser estritamente HTTPS (ex.: <code>https://...</code>) e validado pela verificação de integridade do player. Placeholders como "SEU_STREAM_AQUI" são recusados.
            </span>
          </div>

          <div className="admin-form-actions" style={{ marginTop: '20px' }}>
            <SubmitRadioButton />
          </div>
        </form>
      </section>
    </div>
  );
}
