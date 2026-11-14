'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="admin-nav" aria-label="Navegação administrativa">
      <Link
        href="/admin/videos"
        className={`admin-nav-link ${pathname.startsWith('/admin/videos') ? 'active' : ''}`}
      >
        Vídeos Curtos
      </Link>
      <Link
        href="/admin/configuracoes"
        className={`admin-nav-link ${pathname.startsWith('/admin/configuracoes') ? 'active' : ''}`}
      >
        Configurações
      </Link>
    </nav>
  );
}
