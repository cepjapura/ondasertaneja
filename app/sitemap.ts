import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export const revalidate = 3600;

const BASE_URL = 'https://www.ondasertaneja.com.br';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/noticias`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/artistas`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/agenda`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/lancamentos`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/entrevistas`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/mais-tocadas`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/contato`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  try {
    const [news, artists, events] = await Promise.all([
      prisma.news.findMany({
        where: { isPublished: true },
        select: { slug: true, updatedAt: true },
      }),
      prisma.artist.findMany({
        select: { slug: true, updatedAt: true },
      }),
      prisma.event.findMany({
        where: { isPublished: true },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    const newsRoutes: MetadataRoute.Sitemap = news.map((item) => ({
      url: `${BASE_URL}/noticia/${item.slug}`,
      lastModified: item.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    const artistRoutes: MetadataRoute.Sitemap = artists.map((item) => ({
      url: `${BASE_URL}/artista/${item.slug}`,
      lastModified: item.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    const eventRoutes: MetadataRoute.Sitemap = events.map((item) => ({
      url: `${BASE_URL}/evento/${item.slug}`,
      lastModified: item.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    return [...staticRoutes, ...artistRoutes, ...newsRoutes, ...eventRoutes];
  } catch (error) {
    console.error('Erro ao gerar sitemap dinâmico:', error);
    return staticRoutes;
  }
}
