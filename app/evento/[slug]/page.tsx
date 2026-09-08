import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { EventHeroCover, ArtistAvatar, NewsCardCover } from './EventImages';

interface EventPageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { slug } = params;
  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      city: true,
      venue: true,
    },
  });

  if (!event) {
    return {
      title: 'Evento Não Encontrado | Onda Sertaneja',
      description: 'O evento solicitado não foi encontrado na plataforma Onda Sertaneja.',
    };
  }

  const dateStr = new Date(event.eventDate).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const venueText = event.venue?.name ? `${event.venue.name} — ` : '';
  const title = `${event.title} em ${event.city.name}/${event.city.stateCode} | Onda Sertaneja`;
  const description = `${event.title} no dia ${dateStr} em ${venueText}${event.city.name} - ${event.city.stateCode}. Confira a programação completa e informações.`;
  const url = `https://www.ondasertaneja.com.br/evento/${event.slug}`;

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
  };
}

export const revalidate = 60; // ISR 60s

export default async function EventDetailPage({ params }: EventPageProps) {
  const { slug } = params;

  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      city: true,
      venue: true,
      artists: {
        include: {
          artist: true,
        },
      },
      news: {
        include: {
          news: true,
        },
      },
    },
  });

  if (!event) {
    notFound();
  }

  // Estratégia de Resolução de Imagem Real:
  // 1. Imagem real da notícia vinculada (se NewsEvent existir)
  // 2. Imagem real de um artista relacionado (se EventArtist existir e tiver foto)
  // 3. null: Não reservar área fotográfica vazia, adaptando o layout para formato compacto
  let realCoverUrl: string | null = null;

  const newsWithImage = event.news.find((n) => n.news.coverUrl && n.news.coverUrl.trim().length > 0);
  if (newsWithImage) {
    realCoverUrl = newsWithImage.news.coverUrl;
  } else {
    const artistWithImage = event.artists.find(
      (a) => (a.artist.coverUrl && a.artist.coverUrl.trim().length > 0) || (a.artist.avatarUrl && a.artist.avatarUrl.trim().length > 0)
    );
    if (artistWithImage) {
      realCoverUrl = artistWithImage.artist.coverUrl || artistWithImage.artist.avatarUrl || null;
    }
  }

  // Formatação de Data e Validação de Horário Real
  const dateObj = new Date(event.eventDate);
  const formattedDate = dateObj.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const hours = dateObj.getHours();
  const minutes = dateObj.getMinutes();

  // Se o horário for 00:00 ou 03:00 (originário de ISO UTC midnight), considerar apenas a data sem exibir horário fictício
  const hasRealTime = !(
    (hours === 0 && minutes === 0) ||
    (hours === 3 && minutes === 0) ||
    (hours === 21 && minutes === 0)
  );

  const formattedTime = hasRealTime
    ? dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <main className="main-content" style={{ paddingTop: '40px', paddingBottom: '60px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 20px' }}>
        {/* Breadcrumb Padrão */}
        <nav style={{ marginBottom: '20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <Link href="/" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Início</Link>
          {' / '}
          <Link href="/agenda" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Agenda de Shows</Link>
          {' / '}
          <span style={{ color: 'var(--text-main)' }}>{event.title}</span>
        </nav>

        {/* HERO DO EVENTO ADAPTÁVEL (Com resiliência a imagens quebradas no client) */}
        <section
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            marginBottom: '40px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
          }}
        >
          {/* Componente Client com onError: Esconde o banner automaticamente se a imagem falhar */}
          {realCoverUrl && <EventHeroCover src={realCoverUrl} alt={event.title} />}

          <div style={{ padding: '36px' }}>
            {/* Header da Entidade: SHOW / EVENTO */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <span className="hero-tag" style={{ margin: 0, padding: '4px 12px', fontSize: '0.75rem' }}>
                <i className="fa-solid fa-calendar-days"></i> SHOW / EVENTO
              </span>
              {event.status === 'confirmed' && (
                <span className="tag tag-hot" style={{ fontSize: '0.75rem', padding: '3px 10px' }}>
                  Evento Confirmado
                </span>
              )}
            </div>

            {/* Título Principal do Evento */}
            <h1 style={{ fontSize: '2.4rem', fontFamily: 'var(--font-title)', fontWeight: 800, margin: '0 0 20px', lineHeight: '1.25' }}>
              {event.title}
            </h1>

            {/* Card de Detalhes Básicos (Data, Cidade, Local) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '20px',
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 'var(--radius-sm)',
                padding: '24px',
              }}
            >
              {/* Data e Horário */}
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>
                  <i className="fa-regular fa-calendar-days" style={{ color: 'var(--primary)' }}></i> Data do Evento
                </span>
                <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)', textTransform: 'capitalize' }}>
                  {formattedDate}
                </strong>
                {formattedTime && (
                  <span style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Às {formattedTime}
                  </span>
                )}
              </div>

              {/* Cidade / Estado */}
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>
                  <i className="fa-solid fa-location-dot" style={{ color: 'var(--primary)' }}></i> Cidade / UF
                </span>
                <Link
                  href={`/cidade/${event.city.slug}`}
                  style={{ fontSize: '1.05rem', color: 'var(--text-main)', fontWeight: 700, textDecoration: 'none' }}
                >
                  {event.city.name} - {event.city.stateCode} &rarr;
                </Link>
              </div>

              {/* Local / Venue */}
              {event.venue && (
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>
                    <i className="fa-solid fa-building" style={{ color: 'var(--primary)' }}></i> Local do Show
                  </span>
                  <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>
                    {event.venue.name}
                  </strong>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ARTISTAS PARTICIPANTES DO EVENTO */}
        {event.artists.length > 0 && (
          <section style={{ marginBottom: '45px' }}>
            <div className="section-header" style={{ marginBottom: '20px' }}>
              <h2>🎤 Programação de Artistas ({event.artists.length})</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              {event.artists.map(({ artist, stageName }) => (
                <div
                  key={artist.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {/* Avatar com onError client-side que desvia para icone vetorial se a imagem falhar */}
                    <ArtistAvatar src={artist.avatarUrl || artist.coverUrl} alt={artist.name} />
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                        {artist.name}
                      </h4>
                      {stageName && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Palco: {stageName}
                        </span>
                      )}
                    </div>
                  </div>

                  <Link
                    href={`/artista/${artist.slug}`}
                    className="btn-outline-primary"
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.8rem',
                      textDecoration: 'none',
                      flexShrink: 0,
                    }}
                  >
                    Perfil &rarr;
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* NOTÍCIAS RELACIONADAS AO EVENTO (SOMENTE se NewsEvent existir) */}
        {event.news.length > 0 && (
          <section style={{ marginBottom: '45px' }}>
            <div className="section-header" style={{ marginBottom: '20px' }}>
              <h2>📰 Matérias Relacionadas a este Evento</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              {event.news.map(({ news }) => (
                <article
                  key={news.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    {/* Componente Client com onError para imagem da notícia */}
                    {news.coverUrl && <NewsCardCover src={news.coverUrl} alt={news.title} />}
                    <div style={{ padding: '20px' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                        <i className="fa-regular fa-clock"></i> {new Date(news.publishedAt).toLocaleDateString('pt-BR')}
                      </span>
                      <h3 style={{ fontSize: '1.15rem', margin: '0 0 8px', lineHeight: '1.35', fontWeight: 700 }}>
                        {news.title}
                      </h3>
                      <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.5' }}>
                        {news.summary}
                      </p>
                    </div>
                  </div>

                  <div style={{ padding: '0 20px 20px' }}>
                    <Link
                      href={`/noticia/${news.slug}`}
                      className="btn-outline-primary"
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '6px',
                        width: '100%',
                        padding: '9px',
                        fontSize: '0.85rem',
                        textDecoration: 'none',
                      }}
                    >
                      Ler Matéria Completa <i className="fa-solid fa-arrow-right"></i>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
