import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

interface ArtistPageProps {
  params: {
    slug: string;
  };
}

// 1. GERAÇÃO DE METADATA DINÂMICA (SEO)
export async function generateMetadata({ params }: ArtistPageProps): Promise<Metadata> {
  const { slug } = params;
  const artist = await prisma.artist.findUnique({
    where: { slug },
  });

  if (!artist) {
    return {
      title: 'Artista Não Encontrado | Onda Sertaneja',
      description: 'O perfil de artista solicitado não foi encontrado no Onda Sertaneja.',
    };
  }

  const title = `${artist.name} | Onda Sertaneja`;
  const description = artist.bio
    ? `${artist.bio.slice(0, 150)}...`
    : `Acompanhe a agenda oficial de shows, notícias, lançamentos e vídeos de ${artist.name} na plataforma Onda Sertaneja.`;
  const image = artist.coverUrl || artist.avatarUrl || 'https://www.ondasertaneja.com.br/img/og-cover.jpg';
  const url = `https://www.ondasertaneja.com.br/artista/${artist.slug}`;

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
      images: [
        {
          url: image,
          alt: artist.name,
        },
      ],
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

// 2. COMPONENTE SSR DA PÁGINA DO ARTISTA
export default async function ArtistPage({ params }: ArtistPageProps) {
  const { slug } = params;

  // Buscar dados diretamente do banco de dados (Server-Side Rendering)
  const artist = await prisma.artist.findUnique({
    where: { slug },
    include: {
      members: true,
      events: {
        include: {
          event: {
            include: {
              city: true,
              venue: true,
            },
          },
        },
        orderBy: { event: { eventDate: 'asc' } },
      },
      musics: {
        include: {
          music: {
            include: { album: true },
          },
        },
      },
      news: {
        include: { news: true },
        take: 4,
      },
      relationsAsArtistA: {
        include: { artistB: true },
      },
    },
  });

  if (!artist) {
    notFound();
  }

  // Artistas relacionados com base em registros reais da tabela ArtistRelationship
  const relatedArtists = artist.relationsAsArtistA.map(r => r.artistB);

  const heroBgImage = artist.coverUrl || artist.avatarUrl;

  return (
    <main className="main-content" style={{ paddingTop: 0 }}>
      {/* HERO DO ARTISTA */}
      <section
        className="hero"
        style={{
          minHeight: '420px',
          padding: '60px 20px',
          backgroundImage: heroBgImage ? `url('${heroBgImage}')` : 'linear-gradient(135deg, rgba(255, 85, 0, 0.25) 0%, rgba(18, 20, 26, 0.95) 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 20%',
          position: 'relative',
        }}
      >
        <div className="hero-overlay"></div>
        <div className="hero-content" style={{ zIndex: 2, position: 'relative' }}>
          <span className="hero-tag">
            <i className="fa-solid fa-microphone-lines"></i> {artist.genreTags || 'Sertanejo'}
          </span>
          <h1 style={{ fontSize: '3rem', margin: '10px 0 15px', color: '#fff' }}>{artist.name}</h1>
          <p style={{ maxWidth: '650px', color: 'rgba(255, 255, 255, 0.9)', fontSize: '1.05rem', lineHeight: '1.6' }}>
            {artist.bio || `Acompanhe a trajetória, agenda oficial e novidades de ${artist.name}.`}
          </p>

          {/* Redes Sociais */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            {artist.spotifyId && (
              <a href={`https://open.spotify.com/artist/${artist.spotifyId}`} target="_blank" rel="noreferrer" className="btn-outline-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                <i className="fa-brands fa-spotify"></i> Spotify
              </a>
            )}
            {artist.instagramHandle && (
              <a href={`https://instagram.com/${artist.instagramHandle}`} target="_blank" rel="noreferrer" className="btn-outline-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                <i className="fa-brands fa-instagram"></i> Instagram
              </a>
            )}
            {artist.youtubeChannel && (
              <a href={`https://youtube.com/${artist.youtubeChannel}`} target="_blank" rel="noreferrer" className="btn-outline-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                <i className="fa-brands fa-youtube"></i> YouTube
              </a>
            )}
          </div>
        </div>
      </section>

      {/* CONTEÚDO PRINCIPAL (GRID 2 COLUNAS) */}
      <div style={{ maxWidth: '1200px', margin: '40px auto 0', padding: '0 20px' }}>
        <section className="section grid-layout" style={{ margin: 0, padding: 0 }}>
          {/* COLUNA PRINCIPAL: Agenda de Shows */}
          <div className="col-main">
            <div className="section-header">
              <h2>📅 Próximos Shows ({artist.events.length})</h2>
            </div>

            <div className="agenda-list">
              {artist.events.length === 0 ? (
                <div className="agenda-item">
                  <p style={{ color: 'var(--text-muted)' }}>Nenhum show cadastrado no momento para este artista.</p>
                </div>
              ) : (
                artist.events.map(({ event }) => {
                  const eventDateObj = new Date(event.eventDate);
                  const dia = eventDateObj.getDate().toString().padStart(2, '0');
                  const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
                  const mesStr = meses[eventDateObj.getMonth()];
                  const cidadeStr = event.city ? `${event.city.name} - ${event.city.stateCode}` : '';
                  const localStr = event.venue?.name;

                  return (
                    <div key={event.id} className="agenda-item" style={{ borderColor: event.isHighlight ? 'var(--primary)' : 'var(--border-color)' }}>
                      <div className="agenda-date-box">
                        <span className="agd-day">{dia}</span>
                        <span className="agd-month">{mesStr}</span>
                      </div>
                      <div className="agenda-info">
                        {cidadeStr && <h4><i className="fa-solid fa-location-dot" style={{ color: 'var(--primary)' }}></i> {cidadeStr}</h4>}
                        {localStr && <p style={{ color: 'var(--text-muted)' }}>{localStr}</p>}
                      </div>
                      <div className="agenda-action">
                        {event.ticketUrl ? (
                          <a href={event.ticketUrl} target="_blank" rel="noreferrer" className="btn-outline-primary" style={{ padding: '8px 16px', fontSize: '0.85rem', textDecoration: 'none' }}>
                            Ingressos
                          </a>
                        ) : (
                          <button className="btn-outline-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                            Ingressos
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* SEÇÃO DE LANÇAMENTOS E MÚSICAS */}
            {artist.musics.length > 0 && (
              <div style={{ marginTop: '40px' }}>
                <div className="section-header">
                  <h2>🎧 Som na Caixa (Músicas)</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px' }}>
                  {artist.musics.map(({ music }) => (
                    <div key={music.id} className="release-card" style={{ padding: '15px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="search-item-icon" style={{ width: '42px', height: '42px' }}>
                        <i className="fa-solid fa-music"></i>
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <h4 style={{ fontSize: '0.95rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {music.title}
                        </h4>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{artist.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SIDEBAR: Detalhes & Notícias */}
          <aside className="col-sidebar">
            <div className="sidebar-widget">
              <h3><i className="fa-solid fa-circle-info"></i> Detalhes</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '15px', fontSize: '0.9rem' }}>
                Acompanhe o trajeto do(a) seu artista favorito pela estrada.
              </p>
              {artist.spotifyId ? (
                <a href={`https://open.spotify.com/artist/${artist.spotifyId}`} target="_blank" rel="noreferrer" className="btn-primary btn-block" style={{ textAlign: 'center', textDecoration: 'none' }}>
                  <i className="fa-brands fa-spotify"></i> Ouvir no Spotify
                </a>
              ) : (
                <button className="btn-primary btn-block">
                  <i className="fa-brands fa-spotify"></i> Ouvir no Spotify
                </button>
              )}
            </div>

            {/* NOTÍCIAS VINCULADAS */}
            {artist.news.length > 0 && (
              <div className="sidebar-widget">
                <h3><i className="fa-regular fa-newspaper"></i> Notícias</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {artist.news.map(({ news }) => (
                    <Link key={news.id} href={`/noticia/${news.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>{news.title}</div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(news.publishedAt).toLocaleDateString('pt-BR')}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </section>

        {/* ARTISTAS RELACIONADOS */}
        {relatedArtists.length > 0 && (
          <section className="section" style={{ marginTop: '50px' }}>
            <div className="section-header">
              <h2>⭐ Quem ouve {artist.name} também escuta</h2>
            </div>
            <div className="grid artists-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              {relatedArtists.map(rel => {
                const relImage = rel.avatarUrl || rel.coverUrl;

                return (
                  <div key={rel.id} className="artist-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '15px', textAlign: 'center' }}>
                    <div style={{ width: '100%', height: '180px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {relImage ? (
                        <img src={relImage} alt={rel.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <i className="fa-solid fa-user" style={{ fontSize: '2.5rem', color: 'var(--text-muted)' }}></i>
                      )}
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.1rem', marginBottom: '12px' }}>{rel.name}</h3>
                    <Link href={`/artista/${rel.slug}`} className="btn-outline-primary" style={{ width: '100%', justifyContent: 'center' }}>
                      Ver Perfil
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* SEÇÃO DA CORRENTE: CONTINUE DESCOBRINDO */}
        <section className="section split-cta" style={{ marginTop: '50px', background: 'linear-gradient(135deg, rgba(255,85,0,0.15) 0%, rgba(18,20,26,0.9) 100%)', border: '1px solid var(--primary)', borderRadius: 'var(--radius-lg)', padding: '40px' }}>
          <div className="cta-text">
            <span className="tag tag-exclusive" style={{ marginBottom: '10px', display: 'inline-block' }}>Corrente de Descoberta</span>
            <h2>Continue Explorando a Música Sertaneja</h2>
            <p>Descubra novos shows, eventos nas cidades vizinhas, lançamentos da semana e notícias exclusivas da nossa redação.</p>
          </div>
          <div className="cta-action" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link href="/agenda" className="btn-primary">
              <i className="fa-solid fa-calendar-days"></i> Ver Agenda Completa
            </Link>
            <Link href="/#noticias" className="btn-outline-primary">
              <i className="fa-regular fa-newspaper"></i> Ver Últimas Notícias
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
