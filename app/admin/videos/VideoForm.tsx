'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { createVideoAction } from '../actions';
import { detectVideoSection, VideoSection } from '@/lib/videos';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="admin-btn-primary"
    >
      {pending ? (
        <>
          <span className="admin-spinner" aria-hidden="true" />
          <span>Salvando...</span>
        </>
      ) : (
        <>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Cadastrar Vídeo</span>
        </>
      )}
    </button>
  );
}

export default function VideoForm() {
  const [state, formAction] = useFormState(createVideoAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [url, setUrl] = useState('');
  const [section, setSection] = useState<VideoSection>('TOP_VIDEOS');

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    const detected = detectVideoSection(newUrl);
    if (detected) {
      setSection(detected);
    }
  };

  useEffect(() => {
    if (state?.success && formRef.current) {
      formRef.current.reset();
      setUrl('');
      setSection('TOP_VIDEOS');
    }
  }, [state]);

  return (
    <section className="admin-card" aria-label="Cadastrar novo vídeo">
      <div className="admin-card-header">
        <h2 className="admin-card-title">Novo Vídeo</h2>
        <p className="admin-card-subtitle">
          Cadastre vídeos para as seções Top Vídeos e Shorts da Onda.
        </p>
      </div>

      {state?.error && (
        <div className="admin-alert admin-alert-error" role="alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{state.error}</span>
        </div>
      )}

      {state?.success && (
        <div className="admin-alert admin-alert-success" role="alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Vídeo cadastrado com sucesso! Ele começa como <strong>Rascunho</strong>. Clique em &quot;Publicar&quot; na lista abaixo quando desejar exibi-lo no site.</span>
        </div>
      )}

      <form ref={formRef} action={formAction} className="admin-video-form">
        <div className="admin-form-grid">
          <div className="admin-form-group">
            <label htmlFor="url" className="admin-form-label">
              Link do Vídeo <span className="admin-required">*</span>
            </label>
            <input
              id="url"
              name="url"
              type="url"
              required
              value={url}
              onChange={handleUrlChange}
              placeholder="https://www.youtube.com/watch?v=... ou https://www.youtube.com/shorts/..."
              className="admin-form-input"
            />
            <span className="admin-form-hint">
              Formatos aceitos: YouTube (watch ou shorts), TikTok ou Instagram Reels.
            </span>
          </div>

          <div className="admin-form-group">
            <label htmlFor="section" className="admin-form-label">
              Seção na Home <span className="admin-required">*</span>
            </label>
            <select
              id="section"
              name="section"
              value={section}
              onChange={(e) => setSection(e.target.value as VideoSection)}
              className="admin-form-input"
            >
              <option value="TOP_VIDEOS">Top Vídeos</option>
              <option value="SHORTS">Shorts da Onda</option>
            </select>
            <span className="admin-form-hint">
              Seção padrão: Top Vídeos. Sugestão automática ao colar o link, com opção de trocar.
            </span>
          </div>

          <div className="admin-form-group">
            <label htmlFor="title" className="admin-form-label">
              Título do Vídeo <span className="admin-required">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              placeholder="Ex.: Clipe Oficial - Rádio Onda Sertaneja"
              className="admin-form-input"
            />
          </div>

          <div className="admin-form-group admin-col-full">
            <label htmlFor="thumbnailUrl" className="admin-form-label">
              Capa Personalizada (Opcional)
            </label>
            <input
              id="thumbnailUrl"
              name="thumbnailUrl"
              type="url"
              placeholder="https://... (deixe em branco para capa automática)"
              className="admin-form-input"
            />
            <span className="admin-form-hint">
              Para o YouTube a capa é obtida automaticamente. Para Instagram e TikTok é altamente recomendável informar uma imagem.
            </span>
          </div>
        </div>

        <div className="admin-form-actions">
          <SubmitButton />
        </div>
      </form>
    </section>
  );
}
