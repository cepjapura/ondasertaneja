'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

export interface ProcessedArtist {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  genreTags: string | null;
  musicsCount: number;
  eventsCount: number;
  upcomingEventsCount: number;
  newsCount: number;
  totalActivity: number;
}

interface ArtistasClientProps {
  initialArtists: ProcessedArtist[];
}

export default function ArtistasClient({ initialArtists }: ArtistasClientProps) {
  const [searchFilter, setSearchFilter] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'shows' | 'musics' | 'news'>('all');

  const filteredArtists = useMemo(() => {
    return initialArtists.filter((art) => {
      // 1. Search term filter
      const matchesSearch = searchFilter.trim() === '' ||
        art.name.toLowerCase().includes(searchFilter.toLowerCase().trim()) ||
        (art.genreTags && art.genreTags.toLowerCase().includes(searchFilter.toLowerCase().trim()));

      if (!matchesSearch) return false;

      // 2. Category filter
      if (activeCategory === 'shows') return art.eventsCount > 0;
      if (activeCategory === 'musics') return art.musicsCount > 0;
      if (activeCategory === 'news') return art.newsCount > 0;

      return true;
    });
  }, [initialArtists, searchFilter, activeCategory]);

  // Initial letter generator for avatar-less artists
  const getInitials = (name: string) => {
    const parts = name.split(/\s+/).filter(p => p !== '&' && p.toLowerCase() !== 'e');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
      {/* HERO BANNER DA PÁGINA */}
      <section
        className="section"
        style={{
          margin: '0 0 35px 0',
          padding: '40px 30px',
          background: 'linear-gradient(135deg, rgba(255, 85, 0, 0.18) 0%, rgba(18, 20, 26, 0.95) 100%)',
          border: '1px solid rgba(255, 85, 0, 0.3)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--primary)',
            color: '#fff',
            fontSize: '0.78rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
            marginBottom: '12px',
          }}
        >
          <i className="fa-solid fa-users"></i> Catálogo Oficial
        </span>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fff', margin: '0 0 10px 0' }}>
          Artistas Sertanejos
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '700px', margin: 0, lineHeight: 1.6 }}>
          Explore o universo dos principais cantores e duplas sertanejas. Acompanhe a agenda oficial de shows, notícias, lançamentos e discografia de cada artista.
        </p>
      </section>

      {/* BARRA DE BUSCA E FILTROS */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '15px',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
          background: '#181a20',
          padding: '18px 20px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
        }}
      >
        {/* INPUT DE BUSCA */}
        <div style={{ position: 'relative', minWidth: '280px', flex: '1 1 300px' }}>
          <i
            className="fa-solid fa-magnifying-glass"
            style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--primary)',
              fontSize: '0.9rem',
            }}
          ></i>
          <input
            type="text"
            placeholder="Buscar por nome ou gênero..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 15px 10px 38px',
              background: 'rgba(255, 255, 255, 0.07)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 'var(--radius-full)',
              color: '#fff',
              fontSize: '0.9rem',
              outline: 'none',
              transition: 'var(--transition)',
            }}
          />
          {searchFilter && (
            <button
              onClick={() => setSearchFilter('')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          )}
        </div>

        {/* PILLS DE CATEGORIAS */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveCategory('all')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: activeCategory === 'all' ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.12)',
              background: activeCategory === 'all' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
              color: activeCategory === 'all' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s ease',
            }}
          >
            Todos ({initialArtists.length})
          </button>
          <button
            onClick={() => setActiveCategory('shows')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: activeCategory === 'shows' ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.12)',
              background: activeCategory === 'shows' ? 'rgba(255, 85, 0, 0.2)' : 'rgba(255,255,255,0.05)',
              color: activeCategory === 'shows' ? 'var(--primary)' : 'var(--text-muted)',
              transition: 'all 0.2s ease',
            }}
          >
            <i className="fa-solid fa-calendar-days"></i> Com Shows ({initialArtists.filter(a => a.eventsCount > 0).length})
          </button>
          <button
            onClick={() => setActiveCategory('musics')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: activeCategory === 'musics' ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.12)',
              background: activeCategory === 'musics' ? 'rgba(255, 85, 0, 0.2)' : 'rgba(255,255,255,0.05)',
              color: activeCategory === 'musics' ? 'var(--primary)' : 'var(--text-muted)',
              transition: 'all 0.2s ease',
            }}
          >
            <i className="fa-solid fa-music"></i> Com Músicas ({initialArtists.filter(a => a.musicsCount > 0).length})
          </button>
          <button
            onClick={() => setActiveCategory('news')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: activeCategory === 'news' ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.12)',
              background: activeCategory === 'news' ? 'rgba(255, 85, 0, 0.2)' : 'rgba(255,255,255,0.05)',
              color: activeCategory === 'news' ? 'var(--primary)' : 'var(--text-muted)',
              transition: 'all 0.2s ease',
            }}
          >
            <i className="fa-regular fa-newspaper"></i> Com Notícias ({initialArtists.filter(a => a.newsCount > 0).length})
          </button>
        </div>
      </div>

      {/* GRID DOS ARTISTAS */}
      {filteredArtists.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: '#181a20',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
          }}
        >
          <i className="fa-solid fa-user-slash" style={{ fontSize: '2.5rem', color: 'var(--text-muted)', marginBottom: '15px' }}></i>
          <h3 style={{ fontSize: '1.2rem', color: '#fff', margin: '0 0 10px 0' }}>Nenhum artista encontrado</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: '400px', margin: '0 auto 20px' }}>
            Não encontramos nenhum artista correspondente aos filtros aplicados.
          </p>
          <button
            onClick={() => {
              setSearchFilter('');
              setActiveCategory('all');
            }}
            className="btn-outline-primary"
          >
            Limpar Filtros
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '24px',
          }}
        >
          {filteredArtists.map((artist) => (
            <div
              key={artist.id}
              style={{
                background: '#181a20',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.25s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(255, 85, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* ÁREA DE IMAGEM / EMBLEMA TIPOGRÁFICO */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '220px',
                  background: 'linear-gradient(135deg, rgba(255, 85, 0, 0.25) 0%, rgba(18, 20, 26, 0.95) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {artist.avatarUrl ? (
                  <img
                    src={artist.avatarUrl}
                    alt={artist.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <div
                      style={{
                        width: '75px',
                        height: '75px',
                        borderRadius: '50%',
                        background: 'rgba(255, 85, 0, 0.15)',
                        border: '2px solid var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.8rem',
                        fontWeight: 900,
                        color: '#fff',
                        boxShadow: '0 0 20px rgba(255, 85, 0, 0.3)',
                      }}
                    >
                      {getInitials(artist.name)}
                    </div>
                    <i className="fa-solid fa-microphone-lines" style={{ color: 'var(--primary)', fontSize: '0.9rem' }}></i>
                  </div>
                )}

                {/* BADGE DE GÊNERO */}
                {artist.genreTags && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      background: 'rgba(18, 20, 26, 0.85)',
                      backdropFilter: 'blur(6px)',
                      border: '1px solid rgba(255, 85, 0, 0.4)',
                      color: 'var(--primary)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {artist.genreTags}
                  </span>
                )}
              </div>

              {/* CORPO DO CARD */}
              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    color: '#fff',
                    margin: '0 0 12px 0',
                    lineHeight: 1.3,
                  }}
                >
                  {artist.name}
                </h3>

                {/* CONEXÕES EMPÍRICAS DO ARTISTA NO PORTAL */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px', marginTop: 'auto' }}>
                  {artist.eventsCount > 0 && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: 'rgba(255, 85, 0, 0.12)',
                        color: 'var(--primary)',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: '12px',
                      }}
                    >
                      <i className="fa-solid fa-calendar-days"></i> {artist.eventsCount} {artist.eventsCount === 1 ? 'show' : 'shows'}
                    </span>
                  )}
                  {artist.musicsCount > 0 && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: 'rgba(255, 255, 255, 0.85)',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: '12px',
                      }}
                    >
                      <i className="fa-solid fa-music"></i> {artist.musicsCount} {artist.musicsCount === 1 ? 'música' : 'músicas'}
                    </span>
                  )}
                  {artist.newsCount > 0 && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: 'rgba(255, 255, 255, 0.85)',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: '12px',
                      }}
                    >
                      <i className="fa-regular fa-newspaper"></i> {artist.newsCount} {artist.newsCount === 1 ? 'notícia' : 'notícias'}
                    </span>
                  )}
                </div>

                {/* BOTÃO NAVEGAÇÃO PERFIL */}
                <Link
                  href={`/artista/${artist.slug}`}
                  className="btn-outline-primary"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    textDecoration: 'none',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    padding: '9px 15px',
                  }}
                >
                  Ver Perfil do Artista &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
