'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.trim().length < 2) {
      setIsDropdownOpen(false);
      setSearchResults(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(val.trim())}`)
        .then(res => res.json())
        .then(data => {
          setSearchResults(data);
          setIsDropdownOpen(true);
        })
        .catch(err => console.error('Erro na busca preditiva:', err));
    }, 200);
  };

  return (
    <header className="header">
      <div className="header-container">
        <Link href="/" className="logo">
          ONDA<span>SERTANEJA</span>
        </Link>

        <button
          className="mobile-menu-btn"
          id="mobileMenuBtn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <i className="fa-solid fa-bars"></i>
        </button>

        <nav className={`nav-menu ${mobileMenuOpen ? 'active' : ''}`} id="navMenu">
          <Link href="/" onClick={() => setMobileMenuOpen(false)}>Início</Link>
          <Link href="/#noticias" onClick={() => setMobileMenuOpen(false)}>Notícias</Link>
          <Link href="/agenda" onClick={() => setMobileMenuOpen(false)}>Agenda de Shows</Link>
          <Link href="/lancamentos" onClick={() => setMobileMenuOpen(false)}>Lançamentos</Link>
          <Link href="/contato" onClick={() => setMobileMenuOpen(false)}>Contato</Link>
        </nav>

        <div className="search-container" ref={dropdownRef}>
          <div className="search-input-wrapper">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input
              type="text"
              className="search-input"
              placeholder="Buscar artista, show, cidade..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => {
                if (searchQuery.trim().length >= 2) setIsDropdownOpen(true);
              }}
              autoComplete="off"
            />
          </div>

          {isDropdownOpen && searchResults && (
            <div className="search-dropdown" style={{ display: 'block' }}>
              {(!searchResults.artists?.length &&
                !searchResults.events?.length &&
                !searchResults.news?.length &&
                !searchResults.cities?.length) ? (
                <div style={{ padding: '15px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Nenhum resultado encontrado para &quot;{searchQuery}&quot;.
                </div>
              ) : (
                <>
                  {/* Artistas */}
                  {searchResults.artists?.length > 0 && (
                    <>
                      <div className="search-category-title">👤 Artistas</div>
                      {searchResults.artists.map((art: any) => (
                        <Link
                          key={art.id}
                          href={`/artista/${art.slug}`}
                          className="search-result-item"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          {art.avatarUrl ? (
                            <img
                              src={art.avatarUrl}
                              className="search-item-img"
                              alt={art.name}
                            />
                          ) : (
                            <div className="search-item-icon"><i className="fa-solid fa-user"></i></div>
                          )}
                          <div>
                            <div className="search-item-title">{art.name}</div>
                            <span className="search-item-sub">Perfil do Artista</span>
                          </div>
                        </Link>
                      ))}
                    </>
                  )}

                  {/* Shows */}
                  {searchResults.events?.length > 0 && (
                    <>
                      <div className="search-category-title">📅 Shows & Eventos</div>
                      {searchResults.events.map((ev: any) => {
                        const artistSlug = ev.artists?.[0]?.artist?.slug;
                        const eventLink = artistSlug
                          ? `/artista/${artistSlug}`
                          : ev.city?.slug
                          ? `/cidade/${ev.city.slug}`
                          : '/agenda';

                        return (
                          <Link
                            key={ev.id}
                            href={eventLink}
                            className="search-result-item"
                            onClick={() => setIsDropdownOpen(false)}
                          >
                            <div className="search-item-icon"><i className="fa-solid fa-calendar-days"></i></div>
                            <div>
                              <div className="search-item-title">{ev.title}</div>
                              <span className="search-item-sub">
                                {ev.city ? `${ev.city.name} - ${ev.city.stateCode}` : ''} • {new Date(ev.eventDate).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </>
                  )}

                  {/* Notícias */}
                  {searchResults.news?.length > 0 && (
                    <>
                      <div className="search-category-title">📰 Notícias</div>
                      {searchResults.news.map((n: any) => (
                        <Link
                          key={n.id}
                          href={`/noticia/${n.slug}`}
                          className="search-result-item"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <div className="search-item-icon"><i className="fa-regular fa-newspaper"></i></div>
                          <div>
                            <div className="search-item-title">{n.title}</div>
                            <span className="search-item-sub">{new Date(n.publishedAt).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </Link>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="header-actions">
          <button className="btn-outline-primary"><i className="fa-solid fa-music"></i> Enviar Música</button>
        </div>
      </div>
    </header>
  );
}
