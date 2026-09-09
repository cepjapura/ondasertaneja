'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Header() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
        if (!searchQuery.trim()) {
          setIsSearchExpanded(false);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchQuery]);

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length >= 2) {
      setIsDropdownOpen(false);
      setMobileMenuOpen(false);
      router.push(`/busca?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      inputRef.current?.focus();
    }
  };

  const openSearch = () => {
    setIsSearchExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const closeSearch = () => {
    if (searchQuery) {
      setSearchQuery('');
      setIsDropdownOpen(false);
      setSearchResults(null);
      inputRef.current?.focus();
    } else {
      setIsSearchExpanded(false);
      setIsDropdownOpen(false);
    }
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
          <Link href="/entrevistas" onClick={() => setMobileMenuOpen(false)}>Entrevistas</Link>
          <Link href="/mais-tocadas" onClick={() => setMobileMenuOpen(false)}>Mais Tocadas</Link>
          <Link href="/agenda" onClick={() => setMobileMenuOpen(false)}>Agenda de Shows</Link>
          <Link href="/lancamentos" onClick={() => setMobileMenuOpen(false)}>Lançamentos</Link>
          <Link href="/contato" onClick={() => setMobileMenuOpen(false)}>Contato</Link>
        </nav>

        <div className={`search-container ${isSearchExpanded ? 'expanded' : ''}`} ref={dropdownRef}>
          {!isSearchExpanded ? (
            <button
              type="button"
              className="search-toggle-btn"
              aria-label="Abrir busca"
              title="Abrir busca"
              onClick={openSearch}
            >
              <i className="fa-solid fa-magnifying-glass"></i>
              <span className="search-toggle-label">Buscar...</span>
            </button>
          ) : (
            <form onSubmit={handleSearchSubmit} className="search-input-wrapper">
              <button
                type="submit"
                aria-label="Buscar"
                title="Buscar"
                className="search-submit-btn"
              >
                <i className="fa-solid fa-magnifying-glass"></i>
              </button>
              <input
                ref={inputRef}
                type="text"
                className="search-input"
                placeholder="Buscar artista, show, cidade ou música..."
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => {
                  if (searchQuery.trim().length >= 2) setIsDropdownOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    closeSearch();
                  }
                }}
                autoComplete="off"
              />
              <button
                type="button"
                aria-label="Fechar ou limpar busca"
                title="Fechar ou limpar busca"
                className="search-close-btn"
                onClick={closeSearch}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </form>
          )}

          {isDropdownOpen && searchResults && (
            <div className="search-dropdown" style={{ display: 'block' }}>
              {(!searchResults.artists?.length &&
                !searchResults.events?.length &&
                !searchResults.news?.length &&
                !searchResults.cities?.length &&
                !searchResults.musics?.length) ? (
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
                      {searchResults.events.map((ev: any) => (
                        <Link
                          key={ev.id}
                          href={`/evento/${ev.slug}`}
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
                      ))}
                    </>
                  )}

                  {/* Cidades */}
                  {searchResults.cities?.length > 0 && (
                    <>
                      <div className="search-category-title">📍 Cidades</div>
                      {searchResults.cities.map((c: any) => (
                        <Link
                          key={c.id}
                          href={`/cidade/${c.slug}`}
                          className="search-result-item"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <div className="search-item-icon"><i className="fa-solid fa-location-dot"></i></div>
                          <div>
                            <div className="search-item-title">{c.name} - {c.stateCode}</div>
                            <span className="search-item-sub">Ver agenda de shows da cidade</span>
                          </div>
                        </Link>
                      ))}
                    </>
                  )}

                  {/* Músicas */}
                  {searchResults.musics?.length > 0 && (
                    <>
                      <div className="search-category-title">🎵 Músicas</div>
                      {searchResults.musics.map((m: any) => {
                        const primaryArtist = m.artists?.[0]?.artist;
                        const artistLink = primaryArtist ? `/artista/${primaryArtist.slug}` : '/lancamentos';
                        return (
                          <Link
                            key={m.id}
                            href={artistLink}
                            className="search-result-item"
                            onClick={() => setIsDropdownOpen(false)}
                          >
                            <div className="search-item-icon"><i className="fa-solid fa-music"></i></div>
                            <div>
                              <div className="search-item-title">{m.title}</div>
                              <span className="search-item-sub">
                                {primaryArtist ? `por ${primaryArtist.name}` : 'Música'}
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

                  {/* Botão Ver Todos os Resultados */}
                  <Link
                    href={`/busca?q=${encodeURIComponent(searchQuery.trim())}`}
                    style={{
                      display: 'block',
                      padding: '12px 15px',
                      textAlign: 'center',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: 'var(--primary)',
                      borderTop: '1px solid var(--border-color)',
                      background: 'rgba(255, 85, 0, 0.08)',
                      textDecoration: 'none',
                    }}
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    Ver todos os resultados para &quot;{searchQuery}&quot; &rarr;
                  </Link>
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
