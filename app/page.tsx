import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const revalidate = 60; // ISR 60 segundos

export default async function HomePage() {
  const newsList = await prisma.news.findMany({
    take: 3,
    orderBy: { publishedAt: 'desc' },
  });

  const featuredArtists = await prisma.artist.findMany({
    take: 4,
    orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }],
  });

  const upcomingEvents = await prisma.event.findMany({
    take: 4,
    orderBy: { eventDate: 'asc' },
    include: {
      city: true,
      venue: true,
      artists: { include: { artist: true } },
    },
  });

  const hits = await prisma.music.findMany({
    take: 3,
    where: { isHit: true },
    include: { artists: { include: { artist: true } } },
  });

  return (
    <main className="main-content">
      {/* HERO SECTION */}
      <section className="hero" id="inicio">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <span className="hero-tag"><i className="fa-solid fa-headphones-simple"></i> O PORTAL DA MÚSICA</span>
          <h1>A batida que move<br />o Brasil</h1>
          <p>
            As principais novidades do mundo sertanejo, lançamentos exclusivos, agenda de shows e entretenimento em um só lugar.
          </p>
          <div className="hero-actions">
            <Link href="#noticias" className="btn-primary" style={{ textDecoration: 'none' }}>Ver últimas notícias</Link>
            <Link href="/artista/ana-castela" className="btn-outline-primary" style={{ textDecoration: 'none' }}>
              <i className="fa-solid fa-star"></i> Ver Especial Ana Castela
            </Link>
          </div>
        </div>
      </section>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        {/* NOTÍCIAS */}
        <section className="section" id="noticias">
          <div className="section-header">
            <h2>🔥 Últimas Notícias</h2>
            <Link href="#noticias" className="view-all">Ver todas <i className="fa-solid fa-arrow-right"></i></Link>
          </div>

          <div className="news-grid" id="noticiasGrid">
            {newsList.map(noticia => (
              <article key={noticia.id} className="news-card">
                <Link href={`/noticia/${noticia.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}>
                  <div className="news-img" style={{ backgroundImage: `url('${noticia.coverUrl || ''}')` }}>
                    <span className={`tag ${noticia.trustType === 'confirmed' ? 'tag-hot' : 'tag-release'}`}>
                      {noticia.trustType === 'confirmed' ? '🟢 Confirmado' : 'Notícia'}
                    </span>
                  </div>
                  <div className="news-content">
                    <span className="news-date">{new Date(noticia.publishedAt).toLocaleDateString('pt-BR')}</span>
                    <h3>{noticia.title}</h3>
                    <p>{noticia.summary}</p>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* AGENDA DE SHOWS */}
        <section className="section grid-layout" id="agenda">
          <div className="col-main">
            <div className="section-header">
              <h2>📅 Agenda de Shows</h2>
              <Link href="/agenda" className="view-all" style={{ fontSize: '0.9rem', textDecoration: 'none', color: 'var(--primary)' }}>
                Ver Agenda Completa <i className="fa-solid fa-arrow-right"></i>
              </Link>
            </div>
            <div className="agenda-list">
              {upcomingEvents.map(event => {
                const dateObj = new Date(event.eventDate);
                const dia = dateObj.getDate().toString().padStart(2, '0');
                const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
                const mesStr = meses[dateObj.getMonth()];
                const artistSlug = event.artists[0]?.artist?.slug || 'turne-historias';

                return (
                  <div key={event.id} className="agenda-item" style={{ borderColor: event.isHighlight ? 'var(--primary)' : 'var(--border-color)' }}>
                    <div className="agenda-date-box">
                      <span className="agd-day">{dia}</span>
                      <span className="agd-month">{mesStr}</span>
                    </div>
                    <div className="agenda-info">
                      <h4>
                        <Link href={`/artista/${artistSlug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                          {event.title}
                        </Link>
                      </h4>
                      <p>
                        <i className="fa-solid fa-location-dot"></i> {event.venue?.name || 'Local'} •{' '}
                        {event.city ? (
                          <Link href={`/cidade/${event.city.slug}`} style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}>
                            {event.city.name} - {event.city.stateCode}
                          </Link>
                        ) : 'Brasil'}
                      </p>
                    </div>
                    <div className="agenda-action">
                      <Link href={`/artista/${artistSlug}`} className="btn-outline-primary" style={{ padding: '8px 16px', fontSize: '0.85rem', textDecoration: 'none' }}>
                        Ver Artista
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="col-sidebar">
            <div className="sidebar-widget">
              <h3><i className="fa-solid fa-trophy"></i> As Mais Tocadas</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '15px' }}>
                Acompanhe o ranking em tempo real no Spotify.
              </p>
              <iframe
                style={{ borderRadius: '12px' }}
                src="https://open.spotify.com/embed/playlist/7110oQdXKCBofaBanEYo1Z?utm_source=generator&theme=0"
                width="100%"
                height="352"
                frameBorder="0"
                allowFullScreen
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              ></iframe>
            </div>
          </aside>
        </section>

        {/* ARTISTAS EM DESTAQUE */}
        <section className="section" id="artistas">
          <div className="section-header">
            <h2>⭐ Artistas em Destaque</h2>
          </div>
          <div className="grid artists-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            {featuredArtists.map(artista => (
              <div key={artista.id} className="artist-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '15px', textAlign: 'center' }}>
                {artista.isFeatured && (
                  <span className="tag tag-exclusive" style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10 }}>Destaque</span>
                )}
                <div style={{ width: '100%', height: '200px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: '15px' }}>
                  <img src={artista.avatarUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'} alt={artista.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.2rem', marginBottom: '15px' }}>{artista.name}</h3>
                <Link href={`/artista/${artista.slug}`} className="btn-outline-primary" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}>
                  <i className="fa-solid fa-calendar-days"></i> Ver Perfil & Agenda
                </Link>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
