'use client';

import React, { useTransition } from 'react';
import { deleteAdminUserAction } from '../actions';

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
  lastLogin: Date | null;
  isCurrentAdmin: boolean;
}

interface Props {
  users: AdminUserItem[];
  totalAdmins: number;
}

function formatDate(date: Date | string | null): string {
  if (!date) return 'Nunca logou';
  const d = new Date(date);
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(d);
}

export default function UserList({ users, totalAdmins }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = (userId: string, email: string) => {
    if (!confirm(`Atenção: deseja realmente excluir o administrador "${email}"? Esta ação removerá o acesso permanentemente e não pode ser desfeita.`)) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteAdminUserAction(userId);
      } catch (err: any) {
        alert(err.message || 'Erro ao excluir administrador.');
      }
    });
  };

  return (
    <section className="admin-card" aria-label="Lista de administradores">
      <div className="admin-card-header">
        <h2 className="admin-card-title">Administradores Cadastrados ({users.length})</h2>
        <p className="admin-card-subtitle">
          Gerencie as contas com acesso ao painel de administração da plataforma.
        </p>
      </div>

      <div className="admin-table-responsive">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nome & E-mail</th>
              <th style={{ width: '130px' }}>Função</th>
              <th style={{ width: '160px' }}>Criado em</th>
              <th style={{ width: '160px' }}>Último login</th>
              <th style={{ width: '160px', textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isOnlyOne = totalAdmins <= 1;
              const canDelete = !user.isCurrentAdmin && !isOnlyOne;

              return (
                <tr key={user.id}>
                  {/* Nome & E-mail */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                          {user.name}
                        </span>
                        {user.isCurrentAdmin && (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: 'rgba(37, 211, 102, 0.15)',
                              color: '#25D366',
                              border: '1px solid rgba(37, 211, 102, 0.3)',
                            }}
                          >
                            Você (Sessão atual)
                          </span>
                        )}
                      </div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {user.email}
                      </span>
                    </div>
                  </td>

                  {/* Função */}
                  <td>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: 'var(--bg-hover)',
                        color: 'var(--text-main)',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      {user.role}
                    </span>
                  </td>

                  {/* Criado em */}
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {formatDate(user.createdAt)}
                  </td>

                  {/* Último login */}
                  <td style={{ fontSize: '0.85rem', color: user.lastLogin ? 'var(--text-main)' : 'var(--text-muted)' }}>
                    {formatDate(user.lastLogin)}
                  </td>

                  {/* Ações */}
                  <td style={{ textAlign: 'right' }}>
                    <div className="admin-actions-cell" style={{ justifyContent: 'flex-end' }}>
                      {canDelete ? (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleDelete(user.id, user.email)}
                          className="admin-btn-action delete"
                          title={`Excluir administrador: ${user.email}`}
                          aria-label={`Excluir administrador: ${user.email}`}
                          style={{ minHeight: '44px', minWidth: '44px' }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          <span>Excluir</span>
                        </button>
                      ) : (
                        <span
                          style={{
                            fontSize: '0.78rem',
                            color: 'var(--text-muted)',
                            fontStyle: 'italic',
                            padding: '6px 10px',
                            minHeight: '44px',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                        >
                          {user.isCurrentAdmin ? 'Conta atual' : 'Único admin'}
                        </span>
                      )}
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
