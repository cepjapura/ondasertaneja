import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'Lançamentos Sertanejos & Som na Caixa | Onda Sertaneja',
  description: 'Fique por dentro das últimas músicas, clipes e lançamentos das grandes estrelas e promessas da música sertaneja.',
};

export const revalidate = 60; // ISR 60s

export default async function LancamentosPage() {
  const musics = await prisma.music.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      album: true,
      artists: {
        include: {
          artist: true,
        },
      },
    },
  });

  const hits = musics.filter(m => m.isHit);

  return (
    <main className="main-content" style={{ paddingTop: '40px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        {/* HERO LANÇAMENTOS */}
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
            <i className="fa-solid fa-compact-disc"></i> SOM NA CAIXA
          </span>
          <h1 style={{ fontSize: '2.5rem', margin: '12px 0', fontFamily: 'var(--font-title)' }}>
            Lançamentos da Música Sertaneja
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.85)', maxWidth: '650px', fontSize: '1.1rem' }}>
            Ouça em primeira mão as novas faixas, hits estourados no Spotify e novidades dos seus artistas favoritos.
          </p>
        </section>

        {/* SEÇÃO HITS EM DESTAQUE */}
        {hits.length > 0 && (
          <section className="section" style={{ marginBottom: '40px' }}>
            <div className="section-header">
              <h2>🔥 Tocando Demais (Hits da Semana)</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              {hits.map(music => {
                const primaryArtist = music.artists[0]?.artist;
                const artistSlug = primaryArtist?.slug || 'ana-castela';

                return (
                  <div
                    key={music.id}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                    }}
                  >
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: 'var(--radius-sm)',
                        overflow: 'hidden',
                        flexShrink: 0,
                        background: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        color: '#fff',
                      }}
                    >
                      {primaryArtist?.avatarUrl ? (
                        <img src={primaryArtist.avatarUrl} alt={music.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <i className="fa-solid fa-music"></i>
                      )}
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <h3 style={{ fontSize: '1.1rem', margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {music.title}
                      </h3>
                      {primaryArtist && (
                        <Link href={`/artista/${artistSlug}`} style={{ fontSize: '0.9rem', color: 'var(--primary)', textDecoration: 'none' }}>
                          {primaryArtist.name} &rarr;
                        </Link>
                      )}
                    </div>
                    {music.spotifyTrackId && (
                      <a
                        href={`https://open.spotify.com/track/${music.spotifyTrackId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-outline-primary"
                        style={{ padding: '8px 14px', fontSize: '0.85rem', textDecoration: 'none' }}
                      >
                        <i className="fa-brands fa-spotify"></i>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* LISTAGEM DE TODAS AS MÚSICAS */}
        <section className="section">
          <div className="section-header">
            <h2>🎧 Todos os Lançamentos ({musics.length})</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' }}>
            {musics.map(music => {
              const primaryArtist = music.artists[0]?.artist;
              const artistSlug = primaryArtist?.slug || 'ana-castela';

              return (
                <div
                  key={music.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <span className="tag tag-release" style={{ marginBottom: '8px', display: 'inline-block' }}>Single / Lançamento</span>
                    <h4 style={{ fontSize: '1.05rem', margin: '0 0 6px' }}>{music.title}</h4>
                    {primaryArtist && (
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Por{' '}
                        <Link href={`/artista/${artistSlug}`} style={{ color: 'var(--text-main)', fontWeight: 600, textDecoration: 'none' }}>
                          {primaryArtist.name}
                        </Link>
                      </p>
                    )}
                  </div>

                  <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                    {primaryArtist && (
                      <Link href={`/artista/${artistSlug}`} className="btn-outline-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem', textDecoration: 'none' }}>
                        Ver Artista
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
