'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { saveConfigAction, clearConfigFieldAction } from '../actions';

interface ConfigFormProps {
  initialStreamUrl: string;
  initialPlaylistUrl: string;
  initialPlaylistEmbedUrl: string;
}

function SubmitButton() {
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
          <span>Salvando...</span>
        </>
      ) : (
        <>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          <span>Salvar Configurações</span>
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
  const [state, formAction] = useFormState(saveConfigAction, null);
  const [streamUrl, setStreamUrl] = useState(initialStreamUrl);
  const [playlistUrl, setPlaylistUrl] = useState(initialPlaylistUrl);
  const [clearFeedback, setClearFeedback] = useState<string | null>(null);
  const [isPendingRadioClear, startRadioClear] = useTransition();
  const [isPendingPlaylistClear, startPlaylistClear] = useTransition();

  useEffect(() => {
    setStreamUrl(initialStreamUrl);
  }, [initialStreamUrl]);

  useEffect(() => {
    setPlaylistUrl(initialPlaylistUrl);
  }, [initialPlaylistUrl]);

  const handleClearStream = () => {
    if (confirm('Deseja realmente limpar o link da rádio ao vivo?')) {
      startRadioClear(async () => {
        try {
          await clearConfigFieldAction('streamAudioUrl');
          setStreamUrl('');
          setClearFeedback('Link da rádio ao vivo limpo com sucesso!');
        } catch (err: any) {
          alert('Erro ao limpar campo: ' + err.message);
        }
      });
    }
  };

  const handleClearPlaylist = () => {
    if (confirm('Deseja realmente limpar a Playlist da Onda?')) {
      startPlaylistClear(async () => {
        try {
          await clearConfigFieldAction('playlistUrl');
          setPlaylistUrl('');
          setClearFeedback('Playlist da Onda limpa com sucesso!');
        } catch (err: any) {
          alert('Erro ao limpar campo: ' + err.message);
        }
      });
    }
  };

  return (
    <section className="admin-card" aria-label="Formulário de Configurações">
      <div className="admin-card-header">
        <h2 className="admin-card-title">Transmissão e Playlist</h2>
        <p className="admin-card-subtitle">
          Configure a fonte de áudio principal do site. Caso a rádio ao vivo não esteja disponível, a Playlist da Onda assume o destaque na home.
        </p>
      </div>

      {state?.error && (
        <div className="admin-alert admin-alert-error" role="alert" style={{ marginBottom: '20px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{state.error}</span>
        </div>
      )}

      {state?.success && (
        <div className="admin-alert admin-alert-success" role="alert" style={{ marginBottom: '20px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Configurações salvas e aplicadas com sucesso à página inicial!</span>
        </div>
      )}

      {clearFeedback && (
        <div className="admin-alert admin-alert-success" role="alert" style={{ marginBottom: '20px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{clearFeedback}</span>
        </div>
      )}

      <form action={formAction} className="admin-video-form">
        <div className="admin-form-grid">
          {/* Campo 1: Playlist da Onda */}
          <div className="admin-form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label htmlFor="playlistUrl" className="admin-form-label" style={{ marginBottom: 0 }}>
                Playlist da Onda
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
              Formatos aceitos SOMENTE: <code>open.spotify.com/playlist/&#123;id&#125;</code>, <code>youtube.com/playlist?list=&#123;id&#125;</code> ou <code>music.youtube.com/playlist?list=&#123;id&#125;</code>. Qualquer outro formato será recusado. O embed é montado automaticamente a partir do ID extraído.
            </span>
          </div>

          {/* Campo 2: Link da Rádio ao Vivo */}
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
              type="url"
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder="https://suaradio.com.br:8000/live"
              className="admin-form-input"
            />
            <span className="admin-form-hint">
              O link de áudio deve ser estritamente HTTPS (ex.: <code>https://...</code>) e validado pela verificação de integridade do player. Valores de placeholder como "SEU_STREAM_AQUI" ou "localhost" são automaticamente bloqueados.
            </span>
          </div>
        </div>

        <div className="admin-form-actions" style={{ marginTop: '24px' }}>
          <SubmitButton />
        </div>
      </form>
    </section>
  );
}
