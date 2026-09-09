import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

interface SearchPageProps {
  searchParams: {
    q?: string;
  };
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const query = searchParams.q?.trim() || '';
  const title = query ? `Busca por "${query}" | Onda Sertaneja` : 'Busca | Onda Sertaneja';

  return {
    title,
    description: 'Encontre artistas, shows, cidades, músicas e notícias no portal Onda Sertaneja.',
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = searchParams.q?.trim() || '';

  let artists: any[] = [];
  let events: any[] = [];
  let cities: any[] = [];
  let news: any[] = [];
  let musics: any[] = [];

  if (query.length >= 2) {
    const [artistsRes, eventsRes, citiesRes, newsRes, musicsRes] = await Promise.all([
      prisma.artist.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { slug: { contains: query } },
          ],
        },
        take: 10,
        orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }],
      }),
      prisma.event.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { slug: { contains: query } },
          ],
        },
        take: 10,
        orderBy: [{ isHighlight: 'desc' }, { eventDate: 'asc' }],
        include: {
          city: true,
          venue: true,
        },
      }),
      prisma.city.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { stateCode: { contains: query } },
            { slug: { contains: query } },
          ],
        },
        take: 10,
        orderBy: { name: 'asc' },
      }),
      prisma.news.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { summary: { contains: query } },
          ],
        },
        take: 10,
        orderBy: { publishedAt: 'desc' },
      }),
      prisma.music.findMany({
        where: {
          title: { contains: query },
        },
        take: 10,
        include: {
          album: true,
          artists: {
            include: { artist: true },
          },
        },
      }),
    ]);

    artists = artistsRes;
    events = eventsRes;
    cities = citiesRes;
    news = newsRes;
    musics = musicsRes;
  }

  const totalResults = artists.length + events.length + cities.length + news.length + musics.length;

  return (
    <main className="main-content" style={{ paddingTop: '40px', paddingBottom: '60px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 20px' }}>
        {/* Breadcrumb */}
        <nav style={{ marginBottom: '20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <Link href="/" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Início</Link>
          {' / '}
          <span style={{ color: 'var(--text-main)' }}>Busca</span>
        </nav>

        {/* Título e Header da Busca */}
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '2.2rem', fontFamily: 'var(--font-title)', marginBottom: '10px' }}>
            {query ? (
              <>
                Resultados da busca por <span style={{ color: 'var(--primary)' }}>&quot;{query}&quot;</span>
              </>
            ) : (
              'Busca no Onda Sertaneja'
            )}
          </h1>
          {query && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              {totalResults > 0
                ? `${totalResults} ${totalResults === 1 ? 'resultado encontrado' : 'resultados encontrados'}`
                : 'Nenhum resultado encontrado'}
            </p>
          )}
        </div>

        {/* Sem query ou termo muito curto */}
        {(!query || query.length < 2) && (
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '50px 20px',
              textAlign: 'center',
              marginBottom: '40px',
            }}
          >
            <i className="fa-solid fa-magnifying-glass" style={{ fontSize: '2.5rem', color: 'var(--primary)', marginBottom: '15px' }}></i>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '10px' }}>Digite pelo menos 2 caracteres para pesquisar</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Você pode buscar por nome de artista, cidade, show, música ou notícia.
            </p>
          </div>
        )}

        {/* Com query mas 0 resultados */}
        {query.length >= 2 && totalResults === 0 && (
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '50px 20px',
              textAlign: 'center',
              marginBottom: '40px',
            }}
          >
            <i className="fa-solid fa-circle-exclamation" style={{ fontSize: '2.5rem', color: 'var(--text-muted)', marginBottom: '15px' }}></i>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '10px' }}>Nenhum resultado encontrado para &quot;{query}&quot;</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '500px', margin: '0 auto' }}>
              Verifique a ortografia ou tente pesquisar por termos mais gerais como o nome do artista, cidade ou estilo musical.
            </p>
          </div>
        )}

        {/* RESULTADOS: ARTISTAS */}
        {artists.length > 0 && (
          <section style={{ marginBottom: '45px' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fa-solid fa-user-group" style={{ color: 'var(--primary)' }}></i> Artistas ({artists.length})
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
              {artists.map(artist => (
                <Link
                  key={artist.id}
                  href={`/artista/${artist.slug}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'transform 0.2s, border-color 0.2s',
                  }}
                >
                  {artist.avatarUrl || artist.coverUrl ? (
                    <img
                      src={artist.avatarUrl || artist.coverUrl}
                      alt={artist.name}
                      style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', marginBottom: '12px' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '12px',
                      }}
                    >
                      <i className="fa-solid fa-user" style={{ fontSize: '2rem', color: 'var(--text-muted)' }}></i>
                    </div>
                  )}
                  <h3 style={{ fontSize: '1.1rem', margin: '0 0 4px 0', textAlign: 'center' }}>{artist.name}</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: '6px' }}>Ver Perfil completo &rarr;</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* RESULTADOS: SHOWS & EVENTOS */}
        {events.length > 0 && (
          <section style={{ marginBottom: '45px' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fa-solid fa-calendar-days" style={{ color: 'var(--primary)' }}></i> Shows & Eventos ({events.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {events.map(event => (
                <div
                  key={event.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '16px 20px',
                    gap: '15px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: '1.1rem', margin: '0 0 6px 0' }}>
                      <Link href={`/evento/${event.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        {event.title}
                      </Link>
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                      <i className="fa-solid fa-location-dot" style={{ color: 'var(--primary)', marginRight: '6px' }}></i>
                      {event.venue?.name ? `${event.venue.name} • ` : ''}{event.city ? `${event.city.name} - ${event.city.stateCode}` : ''}
                      {' • '}
                      <i className="fa-regular fa-clock" style={{ marginLeft: '4px', marginRight: '4px' }}></i>
                      {new Date(event.eventDate).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Link
                    href={`/evento/${event.slug}`}
                    className="btn-outline-primary"
                    style={{ padding: '8px 16px', fontSize: '0.85rem', textDecoration: 'none', whiteSpace: 'nowrap' }}
                  >
                    Ver Evento
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* RESULTADOS: CIDADES */}
        {cities.length > 0 && (
          <section style={{ marginBottom: '45px' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fa-solid fa-location-dot" style={{ color: 'var(--primary)' }}></i> Cidades ({cities.length})
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px' }}>
              {cities.map(city => (
                <Link
                  key={city.id}
                  href={`/cidade/${city.slug}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '14px',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <div
                    style={{
                      width: '45px',
                      height: '45px',
                      borderRadius: '50%',
                      background: 'rgba(255,85,0,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <i className="fa-solid fa-city" style={{ fontSize: '1.1rem', color: 'var(--primary)' }}></i>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', margin: 0 }}>{city.name} - {city.stateCode}</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>Ver agenda local &rarr;</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* RESULTADOS: MÚSICAS */}
        {musics.length > 0 && (
          <section style={{ marginBottom: '45px' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fa-solid fa-music" style={{ color: 'var(--primary)' }}></i> Músicas ({musics.length})
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '15px' }}>
              {musics.map(music => {
                const primaryArtist = music.artists?.[0]?.artist;
                const artistLink = primaryArtist ? `/artista/${primaryArtist.slug}` : '/lancamentos';

                return (
                  <Link
                    key={music.id}
                    href={artistLink}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '14px',
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    {music.album?.coverUrl ? (
                      <img
                        src={music.album.coverUrl}
                        alt={music.title}
                        style={{ width: '45px', height: '45px', borderRadius: 'var(--radius-sm)', objectFit: 'cover', flexShrink: 0 }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '45px',
                          height: '45px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(255,255,255,0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <i className="fa-solid fa-compact-disc" style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}></i>
                      </div>
                    )}
                    <div>
                      <h3 style={{ fontSize: '1rem', margin: '0 0 3px 0' }}>{music.title}</h3>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {primaryArtist ? `por ${primaryArtist.name}` : 'Lançamento'}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* RESULTADOS: NOTÍCIAS */}
        {news.length > 0 && (
          <section style={{ marginBottom: '45px' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fa-regular fa-newspaper" style={{ color: 'var(--primary)' }}></i> Notícias ({news.length})
            </h2>
            <div className="news-grid">
              {news.map(item => (
                <article key={item.id} className="news-card">
                  <Link href={`/noticia/${item.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}>
                    {item.coverUrl ? (
                      <div className="news-img" style={{ backgroundImage: `url('${item.coverUrl}')` }}>
                        <span className="tag tag-hot">Notícia</span>
                      </div>
                    ) : (
                      <div style={{ padding: '15px 20px 0 20px' }}>
                        <span className="tag tag-hot">Notícia</span>
                      </div>
                    )}
                    <div className="news-content" style={!item.coverUrl ? { paddingTop: '10px' } : undefined}>
                      <span className="news-date">{new Date(item.publishedAt).toLocaleDateString('pt-BR')}</span>
                      <h3>{item.title}</h3>
                      <p>{item.summary}</p>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
