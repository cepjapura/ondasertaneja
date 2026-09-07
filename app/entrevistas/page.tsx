import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'Entrevistas Exclusivas & Bastidores | Onda Sertaneja',
  description: 'Confira as entrevistas exclusivas, conversas de camarim e bastidores com os maiores nomes e promessas da música sertaneja.',
  openGraph: {
    title: 'Entrevistas Exclusivas — Onda Sertaneja',
    description: 'Papo reto com as estrelas e grandes revelações do sertanejo.',
    url: 'https://www.ondasertaneja.com.br/entrevistas',
    siteName: 'Onda Sertaneja',
    type: 'website',
  },
};

export const revalidate = 60; // ISR 60s

export default async function EntrevistasPage() {
  const interviews = await prisma.news.findMany({
    where: {
      category: 'interview',
    },
    orderBy: {
      publishedAt: 'desc',
    },
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
      events: {
        include: {
          event: true,
        },
      },
    },
  });

  // Identificar entrevista em destaque (isFeatured = true ou a mais recente)
  const featuredInterview = interviews.find((i) => i.isFeatured) || interviews[0];
  const otherInterviews = interviews.filter((i) => i.id !== featuredInterview?.id);

  return (
    <main className="main-content" style={{ paddingTop: '40px', paddingBottom: '60px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        {/* HEADER HERO DA SEÇÃO */}
        <section
          style={{
            background: 'linear-gradient(135deg, rgba(255, 85, 0, 0.22) 0%, rgba(18, 20, 26, 0.96) 100%)',
            border: '1px solid var(--primary)',
            borderRadius: 'var(--radius-lg)',
            padding: '36px 32px',
            marginBottom: '40px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          }}
        >
          <span className="hero-tag">
            <i className="fa-solid fa-microphone-lines"></i> PAPO DE CAMARIM
          </span>
          <h1 style={{ fontSize: '2.4rem', margin: '12px 0 10px', fontFamily: 'var(--font-title)', fontWeight: 800 }}>
            Entrevistas Exclusivas
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.85)', maxWidth: '680px', fontSize: '1.05rem', lineHeight: '1.6', margin: 0 }}>
            Conversas francas, bastidores das turnês, trajetórias e os bastidores dos maiores sucessos da música sertaneja.
          </p>
        </section>

        {/* CASO NÃO HAJA ENTREVISTAS */}
        {interviews.length === 0 && (
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '48px 30px',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <i className="fa-solid fa-microphone-slash" style={{ fontSize: '2.5rem', marginBottom: '16px', color: 'var(--primary)' }}></i>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--text-main)', margin: '0 0 8px', fontWeight: 700 }}>
              Nenhuma entrevista publicada no momento
            </h3>
            <p style={{ margin: 0, fontSize: '0.95rem' }}>
              Fique atento! Novas conversas de camarim e entrevistas exclusivas serão publicadas em breve.
            </p>
          </div>
        )}

        {/* ENTREVISTA EM DESTAQUE */}
        {featuredInterview && (
          <section style={{ marginBottom: '50px' }}>
            <div className="section-header" style={{ marginBottom: '20px' }}>
              <h2>🌟 Entrevista em Destaque</h2>
            </div>
            <article
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                display: 'grid',
                gridTemplateColumns: featuredInterview.coverUrl ? 'repeat(auto-fit, minmax(340px, 1fr))' : '1fr',
                gap: '0',
                boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
              }}
            >
              {/* IMAGEM GRANDE */}
              {featuredInterview.coverUrl && (
                <div style={{ height: '100%', minHeight: '360px', overflow: 'hidden', position: 'relative', background: '#0a0c10' }}>
                  <img
                    src={featuredInterview.coverUrl}
                    alt={featuredInterview.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '16px',
                      left: '16px',
                      background: 'var(--primary)',
                      color: '#fff',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      padding: '5px 12px',
                      borderRadius: 'var(--radius-sm)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    }}
                  >
                    Destaque Editorial
                  </div>
                </div>
              )}

              {/* CONTEÚDO EDITORIAL */}
              <div style={{ padding: '36px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <span>
                      <i className="fa-regular fa-clock"></i> {new Date(featuredInterview.publishedAt).toLocaleDateString('pt-BR')}
                    </span>
                    {featuredInterview.trustType === 'confirmed' && (
                      <span className="tag tag-hot" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                        Entrevista Confirmada
                      </span>
                    )}
                  </div>

                  <h2 style={{ fontSize: '1.85rem', fontFamily: 'var(--font-title)', lineHeight: '1.3', margin: '0 0 16px', color: 'var(--text-main)', fontWeight: 800 }}>
                    {featuredInterview.title}
                  </h2>

                  <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.85)', lineHeight: '1.65', margin: '0 0 24px' }}>
                    {featuredInterview.summary}
                  </p>

                  {/* ARTISTAS ENTREVISTADOS */}
                  {featuredInterview.artists.length > 0 && (
                    <div style={{ marginBottom: '28px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>
                        Entrevistado(a):
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {featuredInterview.artists.map(({ artist }) => (
                          <Link
                            key={artist.id}
                            href={`/artista/${artist.slug}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              background: 'rgba(255, 85, 0, 0.12)',
                              border: '1px solid var(--primary)',
                              borderRadius: '20px',
                              padding: '6px 14px',
                              textDecoration: 'none',
                              color: 'var(--text-main)',
                              fontSize: '0.9rem',
                              fontWeight: 600,
                            }}
                          >
                            <i className="fa-solid fa-microphone" style={{ color: 'var(--primary)', fontSize: '0.85rem' }}></i>
                            {artist.name} &rarr;
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <Link
                    href={`/noticia/${featuredInterview.slug}`}
                    className="btn-outline-primary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 24px',
                      fontSize: '0.95rem',
                      textDecoration: 'none',
                      fontWeight: 700,
                    }}
                  >
                    Ler Entrevista Completa <i className="fa-solid fa-arrow-right"></i>
                  </Link>
                </div>
              </div>
            </article>
          </section>
        )}

        {/* OUTRAS ENTREVISTAS (GRIDE EDITORIAL) */}
        {otherInterviews.length > 0 && (
          <section>
            <div className="section-header" style={{ marginBottom: '20px' }}>
              <h2>🎙️ Mais Entrevistas</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
              {otherInterviews.map((interview) => (
                <article
                  key={interview.id}
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
                    {interview.coverUrl && (
                      <div style={{ height: '200px', width: '100%', overflow: 'hidden', background: '#0a0c10' }}>
                        <img
                          src={interview.coverUrl}
                          alt={interview.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    )}
                    <div style={{ padding: '20px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                        <i className="fa-regular fa-clock"></i> {new Date(interview.publishedAt).toLocaleDateString('pt-BR')}
                      </span>
                      <h3 style={{ fontSize: '1.2rem', margin: '0 0 10px', lineHeight: '1.4', fontWeight: 700 }}>
                        {interview.title}
                      </h3>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.5' }}>
                        {interview.summary}
                      </p>
                    </div>
                  </div>

                  <div style={{ padding: '0 20px 20px' }}>
                    <Link
                      href={`/noticia/${interview.slug}`}
                      className="btn-outline-primary"
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '6px',
                        width: '100%',
                        padding: '10px',
                        fontSize: '0.85rem',
                        textDecoration: 'none',
                      }}
                    >
                      Ver Entrevista <i className="fa-solid fa-arrow-right"></i>
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
