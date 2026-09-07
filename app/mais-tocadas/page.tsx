import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'As Mais Tocadas | Onda Sertaneja',
  description: 'Confira as músicas sertanejas mais tocadas da semana e do ano no rádio e no streaming.',
};

export const revalidate = 60; // ISR 60s

export default async function MaisTocadasPage() {
  const semana = await prisma.chartEntry.findMany({
    where: { period: 'semana' },
    orderBy: { position: 'asc' },
    include: {
      artist: { select: { name: true, slug: true } },
      music: { select: { title: true, slug: true } },
    },
  });

  const ano = await prisma.chartEntry.findMany({
    where: { period: 'ano' },
    orderBy: { position: 'asc' },
    include: {
      artist: { select: { name: true, slug: true } },
      music: { select: { title: true, slug: true } },
    },
  });

  return (
    <main className="main-content" style={{ paddingTop: '40px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        {/* HERO CHARTS */}
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
            <i className="fa-solid fa-chart-simple"></i> PARADAS DE SUCESSO
          </span>
          <h1 style={{ fontSize: '2.5rem', margin: '12px 0', fontFamily: 'var(--font-title)' }}>
            As Mais Tocadas da Onda Sertaneja
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.85)', maxWidth: '650px', fontSize: '1.1rem' }}>
            Acompanhe o ranking oficial das músicas sertanejas mais executadas nas rádios e plataformas digitais.
          </p>
        </section>

        {/* RANKING SEMANAL */}
        {semana.length > 0 && (
          <section className="section" style={{ marginBottom: '50px' }}>
            <div className="section-header" style={{ marginBottom: '24px' }}>
              <h2>🔥 Top Tocadas da Semana</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {semana.map(item => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <span
                      style={{
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        color: item.position === 1 ? 'var(--primary)' : 'var(--text-muted)',
                        minWidth: '32px',
                        textAlign: 'center',
                      }}
                    >
                      #{item.position}
                    </span>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', margin: '0 0 4px 0', color: 'var(--text-color)' }}>
                        {item.songTitle}
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                        {item.artist ? (
                          <Link
                            href={`/artista/${item.artist.slug}`}
                            style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '500' }}
                          >
                            {item.artistName}
                          </Link>
                        ) : (
                          item.artistName
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* RANKING ANUAL */}
        {ano.length > 0 && (
          <section className="section" style={{ marginBottom: '50px' }}>
            <div className="section-header" style={{ marginBottom: '24px' }}>
              <h2>🏆 As Mais Tocadas do Ano</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {ano.map(item => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <span
                      style={{
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        color: item.position === 1 ? 'var(--primary)' : 'var(--text-muted)',
                        minWidth: '32px',
                        textAlign: 'center',
                      }}
                    >
                      #{item.position}
                    </span>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', margin: '0 0 4px 0', color: 'var(--text-color)' }}>
                        {item.songTitle}
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                        {item.artist ? (
                          <Link
                            href={`/artista/${item.artist.slug}`}
                            style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '500' }}
                          >
                            {item.artistName}
                          </Link>
                        ) : (
                          item.artistName
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
