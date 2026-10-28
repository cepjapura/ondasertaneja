import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getStartOfDaySaoPaulo } from '@/lib/dates';
import { isRadioAvailable } from '@/lib/radio';
import HomeRadioCard from '@/components/HomeRadioCard';
import ShortVideosCarousel from '@/components/ShortVideosCarousel';

export const revalidate = 60; // ISR 60 segundos

export default async function HomePage() {
  const startOfToday = getStartOfDaySaoPaulo();

  // 0. Status da Rádio ao Vivo
  const streamConfig = await prisma.systemConfig.findUnique({
    where: { key: 'streamAudioUrl' },
  });
  const radioAvailable = isRadioAvailable(streamConfig?.value);

  // 1. Vídeos curtos verticais publicados
  const shortVideos = await prisma.shortVideo.findMany({
    where: { isPublished: true },
    orderBy: { sortOrder: 'asc' },
  });

  // 2. Últimas 5 notícias publicadas
  const newsList = await prisma.news.findMany({
    where: { isPublished: true },
    take: 5,
    orderBy: { publishedAt: 'desc' },
  });

  // 3. Agenda compacta (até 3 próximos shows publicados)
  const upcomingEvents = await prisma.event.findMany({
    where: {
      isPublished: true,
      eventDate: { gte: startOfToday },
    },
    take: 3,
    orderBy: { eventDate: 'asc' },
    include: {
      city: true,
      venue: true,
      artists: { include: { artist: true } },
    },
  });

  return (
    <main className="main-content">
      <div className="home-container">
        {/* 1. TÍTULO + SUBTÍTULO + CARD DA RÁDIO AO VIVO */}
        <HomeRadioCard initialIsAvailable={radioAvailable} />

        {/* 2. ATALHOS EM FORMATO DE PÍLULA */}
        <nav className="home-shortcuts" aria-label="Atalhos rápidos do site">
          <Link href="/noticias" className="home-pill-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
              <path d="M18 14h-8" />
              <path d="M15 18h-5" />
              <path d="M10 6h8v4h-8V6Z" />
            </svg>
            <span>Notícias</span>
          </Link>

          <Link href="/lancamentos" className="home-pill-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            <span>Lançamentos</span>
          </Link>

          <Link href="/agenda" className="home-pill-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>Agenda</span>
          </Link>

          <Link href="/artistas" className="home-pill-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>Artistas</span>
          </Link>
        </nav>

        {/* 3. ASSISTA EM 30 SEGUNDOS (VÍDEOS VERTICAIS 9:16) */}
        {shortVideos.length > 0 && <ShortVideosCarousel videos={shortVideos} />}

        {/* 4. ÚLTIMAS (NOTÍCIAS) */}
        <section className="home-news-section" aria-label="Últimas notícias">
          <div className="section-header-compact">
            <h2 className="section-title-clean">Últimas Notícias</h2>
            <Link href="/noticias" className="view-all-link">
              <span>Ver todas</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>

          {newsList.length === 0 ? (
            <div
              style={{
                padding: '28px 20px',
                textAlign: 'center',
                background: 'var(--bg-card)',
                border: '1px dashed var(--border-color)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
                <path d="M18 14h-8" />
                <path d="M15 18h-5" />
                <path d="M10 6h8v4h-8V6Z" />
              </svg>
              <p style={{ color: 'var(--text-main)', fontWeight: 700, margin: 0, fontSize: '1rem' }}>
                Em breve novas notícias
              </p>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>
                Estamos preparando novidades e coberturas exclusivas do mundo sertanejo. Fique ligado!
              </p>
            </div>
          ) : (
            <div className="home-news-list">
              {newsList.map((noticia) => (
                <Link
                  key={noticia.id}
                  href={`/noticia/${noticia.slug}`}
                  className="home-news-item"
                >
                  <div className="home-news-thumb">
                    {noticia.coverUrl ? (
                      <img src={noticia.coverUrl} alt="" loading="lazy" />
                    ) : (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    )}
                  </div>
                  <div className="home-news-info">
                    <span className="home-news-tag">Notícia</span>
                    <h3 className="home-news-title">{noticia.title}</h3>
                    <div className="home-news-meta">
                      {new Date(noticia.publishedAt).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* 5. AGENDA (COMPACTA, ATÉ 3 PRÓXIMOS SHOWS) */}
        <section className="home-agenda-section" aria-label="Agenda de shows">
          <div className="section-header-compact">
            <h2 className="section-title-clean">Agenda de Shows</h2>
            <Link href="/agenda" className="view-all-link">
              <span>Ver agenda completa</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>

          {upcomingEvents.length === 0 ? (
            <div
              style={{
                padding: '28px 20px',
                textAlign: 'center',
                background: 'var(--bg-card)',
                border: '1px dashed var(--border-color)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <p style={{ color: 'var(--text-main)', fontWeight: 700, margin: 0, fontSize: '1rem' }}>
                Em breve novos shows na agenda
              </p>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>
                As próximas datas e turnês pelo Brasil serão divulgadas aqui. Fique ligado!
              </p>
            </div>
          ) : (
            <div className="home-agenda-list">
              {upcomingEvents.map((event) => {
                const dateObj = new Date(event.eventDate);
                const dia = dateObj.getDate().toString().padStart(2, '0');
                const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
                const mesStr = meses[dateObj.getMonth()];
                const primaryArtist = event.artists[0]?.artist;

                return (
                  <div key={event.id} className="home-agenda-item">
                    <div className="home-agenda-date">
                      <span className="home-agenda-day">{dia}</span>
                      <span className="home-agenda-month">{mesStr}</span>
                    </div>

                    <div className="home-agenda-details">
                      <h3 className="home-agenda-title">
                        {primaryArtist ? (
                          <Link href={`/artista/${primaryArtist.slug}`} style={{ color: 'inherit' }}>
                            {event.title}
                          </Link>
                        ) : (
                          <span>{event.title}</span>
                        )}
                      </h3>
                      {(event.venue || event.city) && (
                        <p className="home-agenda-location">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          <span>
                            {event.venue?.name}
                            {event.venue?.name && event.city ? ' • ' : ''}
                            {event.city && `${event.city.name} - ${event.city.stateCode}`}
                          </span>
                        </p>
                      )}
                    </div>

                    {primaryArtist && (
                      <div className="home-agenda-action">
                        <Link
                          href={`/artista/${primaryArtist.slug}`}
                          className="btn-outline-primary"
                          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                        >
                          Ver Artista
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 6. PATROCINADOR ALESSANDRO MIOTO */}
        <section className="home-sponsor-section" aria-label="Apoio e Patrocínio">
          <div className="home-sponsor-card">
            <span className="home-sponsor-badge">Apoio e Patrocínio</span>
            <img
              src="/img/sponsors/mioto.png"
              alt="Patrocinador Alessandro Mioto"
              className="home-sponsor-img"
              loading="lazy"
            />
          </div>
        </section>

        {/* 7. BLOCO DA MARCA */}
        <section className="home-brand-block" aria-label="Divulgue sua marca">
          <h2 className="home-brand-text">
            Sua marca no som de quem vive o sertanejo.
          </h2>
          <Link href="/contato" className="home-brand-btn">
            <span>Anuncie com a gente</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </section>
      </div>
    </main>
  );
}
