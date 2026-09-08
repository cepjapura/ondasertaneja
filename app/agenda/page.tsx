import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'Agenda Oficial de Shows Sertanejos | Onda Sertaneja',
  description: 'Confira os próximos shows, festivais e apresentações de música sertaneja em todo o Brasil. Encontre eventos por cidade, estado e artista favorito.',
};

export const revalidate = 60; // ISR 60 segundos

export default async function AgendaPage() {
  const events = await prisma.event.findMany({
    orderBy: { eventDate: 'asc' },
    include: {
      city: true,
      venue: true,
      artists: {
        include: {
          artist: true,
        },
      },
    },
  });

  const featuredArtists = await prisma.artist.findMany({
    take: 6,
    where: { isFeatured: true },
  });

  return (
    <main className="main-content" style={{ paddingTop: '40px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        {/* Banner do Topo */}
        <section
          style={{
            background: 'linear-gradient(135deg, rgba(255, 85, 0, 0.2) 0%, rgba(18, 20, 26, 0.95) 100%)',
            border: '1px solid var(--primary)',
            borderRadius: 'var(--radius-lg)',
            padding: '40px 30px',
            marginBottom: '40px',
          }}
        >
          <span className="hero-tag">
            <i className="fa-solid fa-calendar-days"></i> AGENDA NACIONAL
          </span>
          <h1 style={{ fontSize: '2.5rem', margin: '12px 0', fontFamily: 'var(--font-title)' }}>
            Próximos Shows Sertanejos
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.85)', maxWidth: '650px', fontSize: '1.1rem' }}>
            Acompanhe onde os maiores nomes do sertanejo estarão se apresentando neste mês pelo Brasil.
          </p>
        </section>

        <section className="grid-layout">
          {/* Coluna Principal: Lista de Shows */}
          <div className="col-main">
            <div className="section-header">
              <h2>📅 Todos os Eventos Confirmados ({events.length})</h2>
            </div>

            <div className="agenda-list">
              {events.length === 0 ? (
                <div className="agenda-item">
                  <p style={{ color: 'var(--text-muted)' }}>Nenhum show agendado no momento.</p>
                </div>
              ) : (
                events.map(event => {
                  const dateObj = new Date(event.eventDate);
                  const dia = dateObj.getDate().toString().padStart(2, '0');
                  const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
                  const mesStr = meses[dateObj.getMonth()];
                  const artist = event.artists[0]?.artist;

                  return (
                    <div
                      key={event.id}
                      className="agenda-item"
                      style={{
                        borderColor: event.isHighlight ? 'var(--primary)' : 'var(--border-color)',
                        background: event.isHighlight ? 'rgba(255,85,0,0.05)' : 'var(--bg-card)',
                      }}
                    >
                      <div className="agenda-date-box">
                        <span className="agd-day">{dia}</span>
                        <span className="agd-month">{mesStr}</span>
                      </div>
                      <div className="agenda-info">
                        <h4>
                          <Link href={`/evento/${event.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                            {event.title}
                          </Link>
                        </h4>
                        {(event.venue || event.city) && (
                          <p style={{ color: 'var(--text-muted)' }}>
                            <i className="fa-solid fa-location-dot" style={{ color: 'var(--primary)' }}></i>{' '}
                            {event.venue?.name}
                            {event.venue?.name && event.city ? ' • ' : ''}
                            {event.city && (
                              <Link href={`/cidade/${event.city.slug}`} style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: 600 }}>
                                {event.city.name} - {event.city.stateCode}
                              </Link>
                            )}
                          </p>
                        )}
                      </div>
                      <div className="agenda-action" style={{ display: 'flex', gap: '8px' }}>
                        {event.ticketUrl && (
                          <a
                            href={event.ticketUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-primary"
                            style={{ padding: '8px 16px', fontSize: '0.85rem', textDecoration: 'none' }}
                          >
                            Ingressos
                          </a>
                        )}
                        <Link
                          href={`/evento/${event.slug}`}
                          className="btn-outline-primary"
                          style={{ padding: '8px 16px', fontSize: '0.85rem', textDecoration: 'none' }}
                        >
                          Ver Detalhes
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Sidebar: Artistas em Destaque & Rádio */}
          <aside className="col-sidebar">
            <div className="sidebar-widget">
              <h3><i className="fa-solid fa-star"></i> Artistas na Estrada</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {featuredArtists.map(art => (
                  <Link
                    key={art.id}
                    href={`/artista/${art.slug}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      textDecoration: 'none',
                      color: 'inherit',
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255,255,255,0.03)',
                    }}
                  >
                    {art.avatarUrl ? (
                      <img
                        src={art.avatarUrl}
                        alt={art.name}
                        style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="fa-solid fa-user" style={{ fontSize: '1rem', color: 'var(--text-muted)' }}></i>
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{art.name}</div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ver agenda &rarr;</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
