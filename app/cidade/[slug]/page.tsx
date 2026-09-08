import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

interface CityPageProps {
  params: {
    slug: string;
  };
}

const getBaseUrl = () => process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ondasertaneja.com.br';

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { slug } = params;
  const city = await prisma.city.findUnique({
    where: { slug },
  });

  if (!city) {
    return {
      title: 'Cidade Não Encontrada | Onda Sertaneja',
      description: 'A cidade solicitada não foi encontrada no guia de eventos do Onda Sertaneja.',
    };
  }

  const title = `Shows e Eventos em ${city.name} - ${city.stateCode} | Onda Sertaneja`;
  const description = `Confira os próximos shows sertanejos, eventos, locais e notícias em ${city.name} (${city.stateCode}). Acompanhe seus artistas favoritos no portal Onda Sertaneja!`;
  const url = `${getBaseUrl()}/cidade/${city.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: 'Onda Sertaneja',
      locale: 'pt_BR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

function getStartOfTodayInBrazil(): Date {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === 'year')!.value, 10);
  const month = parseInt(parts.find(p => p.type === 'month')!.value, 10) - 1;
  const day = parseInt(parts.find(p => p.type === 'day')!.value, 10);

  // Início do dia em Brasília (UTC-3), onde 00:00:00 local corresponde a 03:00:00 UTC
  return new Date(Date.UTC(year, month, day, 3, 0, 0, 0));
}

export default async function CityDetailPage({ params }: CityPageProps) {
  const { slug } = params;

  // 1. CÁLCULO REAL DO INÍCIO DO DIA NO TIMEZONE BRASIL (America/Sao_Paulo)
  const startOfToday = getStartOfTodayInBrazil();

  // 2. QUERY OTIMIZADA DIRETA NO PRISMA (Somente eventos futuros e máximo de 6 registros)
  const city = await prisma.city.findUnique({
    where: { slug },
    include: {
      venues: true,
      events: {
        where: {
          eventDate: {
            gte: startOfToday,
          },
        },
        orderBy: { eventDate: 'asc' },
        take: 6,
        include: {
          venue: true,
          artists: {
            include: {
              artist: true,
            },
          },
        },
      },
      news: {
        include: {
          news: true,
        },
        orderBy: { news: { publishedAt: 'desc' } },
      },
    },
  });

  if (!city) {
    notFound();
  }

  // Eventos futuros recuperados do banco de dados (máximo 6)
  const upcomingEvents = city.events;

  // 3. ARTISTAS QUE SE APRESENTAM NOS PRÓXIMOS SHOWS (Derivados exclusivamente dos eventos futuros)
  const artistMap = new Map();
  upcomingEvents.forEach(event => {
    event.artists.forEach(ea => {
      if (ea.artist && !artistMap.has(ea.artist.id)) {
        artistMap.set(ea.artist.id, ea.artist);
      }
    });
  });
  const performingArtists = Array.from(artistMap.values());

  // 4. NOTÍCIAS VINCULADAS À CIDADE
  const cityNews = city.news.map(cn => cn.news).filter(Boolean);

  return (
    <main className="main-content" style={{ paddingTop: '40px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        {/* Breadcrumb */}
        <nav style={{ marginBottom: '20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <Link href="/" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Início</Link>
          {' / '}
          <Link href="/agenda" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Agenda Nacional</Link>
          {' / '}
          <span style={{ color: 'var(--text-main)' }}>{city.name} - {city.stateCode}</span>
        </nav>

        {/* CABEÇALHO DA CIDADE */}
        <section
          style={{
            background: 'linear-gradient(135deg, rgba(255, 85, 0, 0.25) 0%, rgba(18, 20, 26, 0.95) 100%)',
            border: '1px solid var(--primary)',
            borderRadius: 'var(--radius-lg)',
            padding: '40px 30px',
            marginBottom: '40px',
          }}
        >
          <span className="hero-tag">
            <i className="fa-solid fa-location-dot"></i> CIDADE & REGIÃO
          </span>
          <h1 style={{ fontSize: '2.8rem', margin: '12px 0', fontFamily: 'var(--font-title)' }}>
            {city.name} <span style={{ color: 'var(--primary)' }}>— {city.stateCode}</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.85)', maxWidth: '650px', fontSize: '1.1rem' }}>
            Guia oficial de shows sertanejos, grandes eventos, palcos e notícias de {city.name} e região.
          </p>
        </section>

        <section className="grid-layout">
          {/* COLUNA PRINCIPAL */}
          <div className="col-main">
            {/* PRÓXIMOS SHOWS NA CIDADE */}
            <div className="section-header">
              <h2>📅 Próximos Shows em {city.name} ({upcomingEvents.length})</h2>
              {upcomingEvents.length === 6 && (
                <Link href="/agenda" style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none' }}>
                  Ver agenda completa &rarr;
                </Link>
              )}
            </div>

            <div className="agenda-list" style={{ marginBottom: '40px' }}>
              {upcomingEvents.length === 0 ? (
                <div className="agenda-item">
                  <p style={{ color: 'var(--text-muted)' }}>
                    Nenhum show agendado para {city.name} no momento. Acompanhe nossas atualizações!
                  </p>
                </div>
              ) : (
                upcomingEvents.map(event => {
                  const dateObj = new Date(event.eventDate);
                  const dia = dateObj.getDate().toString().padStart(2, '0');
                  const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
                  const mesStr = meses[dateObj.getMonth()];
                  const primaryArtist = event.artists[0]?.artist;

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
                        <p style={{ color: 'var(--text-muted)' }}>
                          <i className="fa-solid fa-building" style={{ color: 'var(--primary)' }}></i>{' '}
                          {event.venue?.name ? `${event.venue.name} • ` : ''}{city.name} - {city.stateCode}
                        </p>
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

            {/* ARTISTAS QUE SE APRESENTAM NA CIDADE */}
            {performingArtists.length > 0 && (
              <div style={{ marginBottom: '40px' }}>
                <div className="section-header">
                  <h2>⭐ Artistas com Show em {city.name}</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                  {performingArtists.map(artist => {
                    const artistImage = artist.avatarUrl || artist.coverUrl;

                    return (
                      <div
                        key={artist.id}
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-md)',
                          padding: '16px',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto 12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {artistImage ? (
                            <img
                              src={artistImage}
                              alt={artist.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <i className="fa-solid fa-user" style={{ fontSize: '1.8rem', color: 'var(--text-muted)' }}></i>
                          )}
                        </div>
                      <h3 style={{ fontSize: '1.05rem', margin: '0 0 10px', fontFamily: 'var(--font-title)' }}>
                        {artist.name}
                      </h3>
                      <Link
                        href={`/artista/${artist.slug}`}
                        className="btn-outline-primary"
                        style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem', padding: '6px 12px', textDecoration: 'none' }}
                      >
                        Ver Perfil
                      </Link>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* NOTÍCIAS RELACIONADAS À CIDADE */}
            {cityNews.length > 0 && (
              <div style={{ marginBottom: '40px' }}>
                <div className="section-header">
                  <h2>📰 Notícias de {city.name}</h2>
                </div>
                <div className="news-grid">
                  {cityNews.map(news => (
                    <article key={news.id} className="news-card">
                      <Link href={`/noticia/${news.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}>
                        <div className="news-img" style={{ backgroundImage: `url('${news.coverUrl || ''}')` }}>
                          <span className="tag tag-hot">Notícia</span>
                        </div>
                        <div className="news-content">
                          <span className="news-date">{new Date(news.publishedAt).toLocaleDateString('pt-BR')}</span>
                          <h3>{news.title}</h3>
                          <p>{news.summary}</p>
                        </div>
                      </Link>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SIDEBAR: LOCAIS DE EVENTOS / VENUES */}
          <aside className="col-sidebar">
            {city.venues.length > 0 && (
              <div className="sidebar-widget" style={{ marginBottom: '30px' }}>
                <h3><i className="fa-solid fa-building-ngo"></i> Palcos em {city.name}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '15px' }}>
                  Principais casas de show, arenas e parques de exposição da cidade.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {city.venues.map(venue => (
                    <div
                      key={venue.id}
                      style={{
                        padding: '12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        <i className="fa-solid fa-location-dot" style={{ color: 'var(--primary)', marginRight: '6px' }}></i>
                        {venue.name}
                      </div>
                      {venue.address && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {venue.address}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="sidebar-widget">
              <h3><i className="fa-solid fa-compass"></i> Explorar Outras Cidades</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '15px' }}>
                Pesquise agendas e notícias de qualquer cidade no topo do site.
              </p>
              <Link href="/agenda" className="btn-outline-primary" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}>
                <i className="fa-solid fa-calendar-days"></i> Ver Agenda Completa
              </Link>
            </div>
          </aside>
        </section>

        {/* CORRENTE DE DESCOBERTA */}
        <section
          className="section split-cta"
          style={{
            marginTop: '50px',
            background: 'linear-gradient(135deg, rgba(255,85,0,0.15) 0%, rgba(18,20,26,0.9) 100%)',
            border: '1px solid var(--primary)',
            borderRadius: 'var(--radius-lg)',
            padding: '40px',
          }}
        >
          <div className="cta-text">
            <span className="tag tag-exclusive" style={{ marginBottom: '10px', display: 'inline-block' }}>Corrente de Descoberta</span>
            <h2>Você está em {city.name} — {city.stateCode}</h2>
            <p>Descubra artistas sertanejos em turnê, novidades de lançamentos no rádio e eventos nas cidades vizinhas.</p>
          </div>
          <div className="cta-action" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link href="/agenda" className="btn-primary" style={{ textDecoration: 'none' }}>
              <i className="fa-solid fa-calendar-days"></i> Ver Agenda Completa
            </Link>
            <Link href="/lancamentos" className="btn-outline-primary" style={{ textDecoration: 'none' }}>
              <i className="fa-solid fa-compact-disc"></i> Som na Caixa (Lançamentos)
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
