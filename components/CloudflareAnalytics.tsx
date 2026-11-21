'use client';

import React from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';

interface CloudflareAnalyticsProps {
  token?: string;
}

export default function CloudflareAnalytics({ token }: CloudflareAnalyticsProps) {
  const pathname = usePathname();
  const cfToken = token || process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN;

  // Carrega SOMENTE se a variável existir e NODE_ENV === 'production'
  if (process.env.NODE_ENV !== 'production' || !cfToken) {
    return null;
  }

  // Não carrega nas páginas /admin
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <Script
      src="https://static.cloudflareinsights.com/beacon.min.js"
      strategy="afterInteractive"
      data-cf-beacon={`{"token":"${cfToken}"}`}
      defer
    />
  );
}
