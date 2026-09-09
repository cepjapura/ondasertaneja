import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import ArtistasClient, { ProcessedArtist } from './ArtistasClient';

export const metadata: Metadata = {
  title: 'Artistas Sertanejos | Catálogo e Perfil dos Artistas | Onda Sertaneja',
  description: 'Descubra o catálogo completo dos principais artistas sertanejos. Acompanhe a agenda oficial de shows, notícias, lançamentos e o universo de cada artista.',
  alternates: {
    canonical: 'https://www.ondasertaneja.com.br/artistas',
  },
  openGraph: {
    title: 'Artistas Sertanejos | Onda Sertaneja',
    description: 'Descubra o catálogo completo dos principais artistas sertanejos na plataforma Onda Sertaneja.',
    url: 'https://www.ondasertaneja.com.br/artistas',
    siteName: 'Onda Sertaneja',
    images: [
      {
        url: 'https://www.ondasertaneja.com.br/img/og-cover.jpg',
        alt: 'Artistas Sertanejos | Onda Sertaneja',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Artistas Sertanejos | Onda Sertaneja',
    description: 'Descubra o catálogo completo dos principais artistas sertanejos na plataforma Onda Sertaneja.',
    images: ['https://www.ondasertaneja.com.br/img/og-cover.jpg'],
  },
};

export default async function ArtistasPage() {
  const artists = await prisma.artist.findMany({
    orderBy: { name: 'asc' },
    include: {
      musics: {
        include: { music: true },
      },
      events: {
        include: {
          event: {
            include: { city: true },
          },
        },
      },
      news: {
        include: { news: true },
      },
    },
  });

  const now = new Date();

  // Process activity scores and sort artists
  const processedArtists: ProcessedArtist[] = artists
    .map((art) => {
      const upcomingEvents = art.events.filter((e) => new Date(e.event.eventDate) >= now);
      const totalActivity = art.musics.length + art.events.length + art.news.length;
      return {
        id: art.id,
        name: art.name,
        slug: art.slug,
        avatarUrl: art.avatarUrl,
        coverUrl: art.coverUrl,
        genreTags: art.genreTags,
        musicsCount: art.musics.length,
        eventsCount: art.events.length,
        upcomingEventsCount: upcomingEvents.length,
        newsCount: art.news.length,
        totalActivity,
      };
    })
    .sort((a, b) => b.totalActivity - a.totalActivity || a.name.localeCompare(b.name));

  return (
    <main className="main-content" style={{ paddingTop: '20px', paddingBottom: '60px' }}>
      <ArtistasClient initialArtists={processedArtists} />
    </main>
  );
}
