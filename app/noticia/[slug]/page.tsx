import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

interface NewsPageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: NewsPageProps): Promise<Metadata> {
  const { slug } = params;
  const noticia = await prisma.news.findUnique({
    where: { slug },
  });

  if (!noticia) {
    return {
      title: 'Notícia Não Encontrada | Onda Sertaneja',
      description: 'A notícia solicitada não foi encontrada na plataforma Onda Sertaneja.',
    };
  }

  const title = `${noticia.title} | Onda Sertaneja`;
  const description = noticia.summary;
  const image = noticia.coverUrl || 'https://www.ondasertaneja.com.br/img/og-cover.jpg';
  const url = `https://www.ondasertaneja.com.br/noticia/${noticia.slug}`;

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
          alt: noticia.title,
        },
      ],
      type: 'article',
      publishedTime: noticia.publishedAt.toISOString(),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default async function NewsDetailPage({ params }: NewsPageProps) {
  const { slug } = params;

  const noticia = await prisma.news.findUnique({
    where: { slug },
    include: {
      author: true,
      artists: {
        include: {
          artist: true,
        },
      },
      events: {
        include: {
          event: {
            include: {
              city: true,
              venue: true,
            },
          },
        },
      },
      cities: {
        include: {
          city: true,
        },
      },
    },
  });

  if (!noticia) {
    notFound();
  }

  // Notícias recomendadas (outras notícias recentes)
  const recommendedNews = await prisma.news.findMany({
    where: {
      id: { not: noticia.id },
    },
    take: 3,
    orderBy: { publishedAt: 'desc' },
  });

  return (
    <main className="main-content" style={{ paddingTop: '40px' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 20px' }}>
        {/* Breadcrumb */}
        <nav style={{ marginBottom: '20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <Link href="/" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Início</Link>
          {' / '}
          <Link href="/#noticias" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Notícias</Link>
          {' / '}
          <span style={{ color: 'var(--text-main)' }}>{noticia.title}</span>
        </nav>

        {/* Categoria e Tag de Confiança */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px' }}>
          <span className={`tag ${noticia.trustType === 'confirmed' ? 'tag-hot' : 'tag-release'}`}>
            {noticia.trustType === 'confirmed' ? '🟢 Notícia Confirmada' : 'Notícia'}
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <i className="fa-regular fa-clock"></i> Publicado em {new Date(noticia.publishedAt).toLocaleDateString('pt-BR')}
          </span>
        </div>

        {/* Título Principal */}
        <h1 style={{ fontSize: '2.4rem', fontFamily: 'var(--font-title)', lineHeight: '1.25', marginBottom: '20px' }}>
          {noticia.title}
        </h1>

        {/* Resumo */}
        <p style={{ fontSize: '1.2rem', color: 'rgba(255, 255, 255, 0.85)', lineHeight: '1.6', marginBottom: '30px', fontWeight: 500 }}>
          {noticia.summary}
        </p>

        {/* Imagem de Capa */}
        {noticia.coverUrl && (
          <div style={{ width: '100%', height: '420px', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '35px', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
            <img src={noticia.coverUrl} alt={noticia.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}

        {/* Conteúdo da Notícia */}
        <article
          style={{
            fontSize: '1.1rem',
            lineHeight: '1.8',
            color: 'var(--text-main)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '30px',
            marginBottom: '40px',
          }}
        >
          {noticia.contentJson.split('\n\n').map((paragraph, idx) => (
            <p key={idx} style={{ marginBottom: '20px' }}>
              {paragraph}
            </p>
          ))}
        </article>

        {/* ARTISTAS VINCULADOS A ESTA NOTÍCIA (Conexão do Produto) */}
        {noticia.artists.length > 0 && (
          <section style={{ marginBottom: '40px' }}>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-microphone-lines" style={{ color: 'var(--primary)' }}></i> Artistas citados nesta matéria
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
              {noticia.artists.map(({ artist }) => (
                <Link
                  key={artist.id}
                  href={`/artista/${artist.slug}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  {artist.avatarUrl || artist.coverUrl ? (
                    <img
                      src={artist.avatarUrl || artist.coverUrl}
                      alt={artist.name}
                      style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="fa-solid fa-user" style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}></i>
                    </div>
                  )}
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem' }}>{artist.name}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>Ver perfil completo &rarr;</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* SHOWS E EVENTOS VINCULADOS */}
        {noticia.events.length > 0 && (
          <section style={{ marginBottom: '40px' }}>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-calendar-days" style={{ color: 'var(--primary)' }}></i> Shows Relacionados
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {noticia.events.map(({ event }) => {
                const eventLink = `/evento/${event.slug}`;
                return (
                  <div key={event.id} className="agenda-item" style={{ margin: 0 }}>
                    <div className="agenda-info">
                      <h4>
                        <Link href={eventLink} style={{ color: 'inherit', textDecoration: 'none' }}>
                          {event.title}
                        </Link>
                      </h4>
                      <p><i className="fa-solid fa-location-dot"></i> {event.venue?.name} • {event.city?.name} - {event.city?.stateCode}</p>
                    </div>
                    <div className="agenda-action">
                      <Link href={eventLink} className="btn-outline-primary" style={{ padding: '8px 16px', fontSize: '0.85rem', textDecoration: 'none' }}>
                        Ver Evento
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* OUTRAS NOTÍCIAS RECOMENDADAS */}
        {recommendedNews.length > 0 && (
          <section style={{ marginTop: '50px', marginBottom: '50px' }}>
            <div className="section-header">
              <h2>🔥 Leia Também</h2>
            </div>
            <div className="news-grid">
              {recommendedNews.map(rec => (
                <article key={rec.id} className="news-card">
                  <Link href={`/noticia/${rec.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}>
                    <div className="news-img" style={{ backgroundImage: `url('${rec.coverUrl || ''}')` }}>
                      <span className="tag tag-hot">Notícia</span>
                    </div>
                    <div className="news-content">
                      <span className="news-date">{new Date(rec.publishedAt).toLocaleDateString('pt-BR')}</span>
                      <h3>{rec.title}</h3>
                      <p>{rec.summary}</p>
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
