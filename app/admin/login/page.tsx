'use client';

import React from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { loginAction } from '../actions';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="admin-btn-primary admin-btn-full"
    >
      {pending ? 'Entrando...' : 'Entrar no Painel'}
    </button>
  );
}

export default function AdminLoginPage() {
  const [state, formAction] = useFormState(loginAction, null);
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/admin/videos';

  return (
    <div className="admin-login-wrapper">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <h1 className="admin-login-title">
            ONDA<span>ADMIN</span>
          </h1>
          <p className="admin-login-subtitle">
            Acesso restrito à equipe editorial Onda Sertaneja
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

        <form action={formAction} className="admin-login-form">
          <input type="hidden" name="next" value={next} />

          <div className="admin-form-group">
            <label htmlFor="email" className="admin-form-label">
              E-mail Administrativo
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              className="admin-form-input"
              placeholder="seu.email@ondasertaneja.com.br"
            />
          </div>

          <div className="admin-form-group">
            <label htmlFor="password" className="admin-form-label">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="admin-form-input"
              placeholder="••••••••••••"
            />
          </div>

          <SubmitButton />
        </form>
      </div>
    </div>
  );
}
