import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getAdminSession } from '@/lib/auth';
import { logoutAction } from './actions';

export const metadata: Metadata = {
  title: 'Painel Administrativo | Onda Sertaneja',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();

  return (
    <div className="admin-root">
      {session.isLoggedIn && (
        <header className="admin-header">
          <div className="admin-header-container">
            <div className="admin-brand">
              <Link href="/admin/videos" className="admin-logo">
                ONDA<span>ADMIN</span>
              </Link>
              <nav className="admin-nav">
                <Link href="/admin/videos" className="admin-nav-link active">
                  Vídeos Curtos
                </Link>
              </nav>
            </div>

            <div className="admin-user-menu">
              <span className="admin-user-name">
                {session.name || session.email}
              </span>
              <Link href="/" target="_blank" rel="noopener noreferrer" className="admin-btn-secondary" title="Ver site público">
                Ver Site
              </Link>
              <form action={logoutAction}>
                <button type="submit" className="admin-btn-logout">
                  Sair
                </button>
              </form>
            </div>
          </div>
        </header>
      )}

      <main className="admin-main">
        {children}
      </main>
    </div>
  );
}
