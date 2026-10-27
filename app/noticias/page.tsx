import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'Notícias do Sertanejo | Coberturas, Lançamentos e Bastidores | Onda Sertaneja',
  description: 'Fique por dentro de tudo o que acontece no universo da música sertaneja: lançamentos, entrevistas exclusivas, turnês, bastidores e novidades dos seus artistas favoritos.',
  alternates: {
    canonical: 'https://www.ondasertaneja.com.br/noticias',
  },
  openGraph: {
    title: 'Notícias do Sertanejo | Onda Sertaneja',
    description: 'Fique por dentro de tudo o que acontece no universo da música sertaneja.',
    url: 'https://www.ondasertaneja.com.br/noticias',
    siteName: 'Onda Sertaneja',
    images: [
      {
        url: 'https://www.ondasertaneja.com.br/img/og-cover.jpg',
        alt: 'Notícias do Sertanejo | Onda Sertaneja',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Notícias do Sertanejo | Onda Sertaneja',
    description: 'Fique por dentro de tudo o que acontece no universo da música sertaneja.',
    images: ['https://www.ondasertaneja.com.br/img/og-cover.jpg'],
  },
};

export const revalidate = 60; // ISR 60s

export default async function NoticiasPage() {
  const newsList = await prisma.news.findMany({
    orderBy: { publishedAt: 'desc' },
    include: {
      artists: {
        include: {
          artist: true,
        },
      },
      cities: {
        include: {
          city: true,
        },
      },
    },
  });

  return (
    <main className="main-content" style={{ paddingTop: '40px', paddingBottom: '60px' }}>
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
            <i className="fa-solid fa-newspaper"></i> PORTAL DE NOTÍCIAS
          </span>
          <h1 style={{ fontSize: '2.5rem', margin: '12px 0', fontFamily: 'var(--font-title)' }}>
            Últimas Notícias do Sertanejo
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.85)', maxWidth: '650px', fontSize: '1.1rem' }}>
            Acompanhe as principais novidades, coberturas de shows, lançamentos e bastidores das maiores estrelas do sertanejo.
          </p>
        </section>

        {/* Grade de Notícias */}
        <section className="section" style={{ padding: 0 }}>
          <div className="section-header">
            <h2>🔥 Todas as Matérias ({newsList.length})</h2>
          </div>

          {newsList.length === 0 ? (
            <div
              className="agenda-item"
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                background: 'var(--bg-card)',
                border: '1px dashed var(--border-color)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <i className="fa-solid fa-newspaper" style={{ fontSize: '2.5rem', color: 'var(--primary)', marginBottom: '10px' }}></i>
              <p style={{ color: 'var(--text-main)', fontWeight: 600, margin: 0, fontSize: '1.1rem' }}>
                Nenhuma notícia publicada no momento.
              </p>
              <p style={{ color: 'var(--text-muted)', margin: '6px 0 0', fontSize: '0.9rem' }}>
                Fique atento! Novas matérias serão publicadas em breve.
              </p>
            </div>
          ) : (
            <div className="news-grid">
              {newsList.map((noticia) => {
                const dateStr = new Date(noticia.publishedAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                });

                return (
                  <article key={noticia.id} className="news-card">
                    <Link
                      href={`/noticia/${noticia.slug}`}
                      style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', height: '100%' }}
                    >
                      <div
                        className="news-img"
                        style={{
                          backgroundImage: `url('${noticia.coverUrl || '/img/og-cover.jpg'}')`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          position: 'relative',
                          height: '220px',
                        }}
                      >
                        <span className={`tag ${noticia.trustType === 'confirmed' ? 'tag-hot' : 'tag-release'}`}>
                          {noticia.trustType === 'confirmed' ? '🟢 Confirmado' : 'Notícia'}
                        </span>
                        {noticia.category === 'interview' && (
                          <span
                            className="tag"
                            style={{
                              position: 'absolute',
                              bottom: '12px',
                              left: '12px',
                              background: 'rgba(0,0,0,0.75)',
                              color: '#fff',
                              fontSize: '0.75rem',
                              border: '1px solid rgba(255,255,255,0.2)',
                            }}
                          >
                            <i className="fa-solid fa-microphone-lines" style={{ marginRight: '5px' }}></i> Entrevista
                          </span>
                        )}
                      </div>
                      <div className="news-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px' }}>
                        <span className="news-date" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>
                          <i className="fa-regular fa-clock" style={{ marginRight: '5px' }}></i> {dateStr}
                        </span>
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '10px', lineHeight: '1.4' }}>{noticia.title}</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5', flex: 1 }}>{noticia.summary}</p>
                        
                        {noticia.artists.length > 0 && (
                          <div style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {noticia.artists.map(({ artist }) => (
                              <span
                                key={artist.id}
                                style={{
                                  fontSize: '0.75rem',
                                  background: 'rgba(255,85,0,0.1)',
                                  color: 'var(--primary)',
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  fontWeight: 600,
                                }}
                              >
                                {artist.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
