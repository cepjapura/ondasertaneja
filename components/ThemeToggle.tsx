'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Antes de montar no client, assume modo Black (padrão) para evitar layout shift
  const isLight = mounted && resolvedTheme === 'light';

  const toggleTheme = () => {
    setTheme(isLight ? 'dark' : 'light');
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle-btn"
      aria-label={isLight ? 'Mudar para modo Black' : 'Mudar para modo Claro'}
      title={isLight ? 'Mudar para modo Black' : 'Mudar para modo Claro'}
    >
      {/* Ícone de lua no modo Claro e de sol no Black */}
      {isLight ? (
        <i className="fa-solid fa-moon" aria-hidden="true" />
      ) : (
        <i className="fa-solid fa-sun" aria-hidden="true" />
      )}
    </button>
  );
}
