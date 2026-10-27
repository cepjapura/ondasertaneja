import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verificando necessidade de carga inicial (seed)...');

  const artistCount = await prisma.artist.count();
  if (artistCount > 0) {
    console.log(`✅ O banco de dados já possui ${artistCount} artistas. Seed ignorado (idempotência garantida).`);
    return;
  }

  console.log('🌱 Banco vazio detectado. Iniciando seed transacional a partir de data/seed-dump.json...');

  const dumpPath = path.resolve(__dirname, '..', 'data', 'seed-dump.json');
  if (!fs.existsSync(dumpPath)) {
    throw new Error(`Arquivo de dump não encontrado em: ${dumpPath}`);
  }

  const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf-8'));

  await prisma.$transaction(async (tx) => {
    // 1. SystemConfig
    if (dump.SystemConfig) {
      for (const c of dump.SystemConfig) {
        await tx.systemConfig.upsert({
          where: { key: c.key },
          create: { key: c.key, value: c.value },
          update: { value: c.value },
        });
      }
      console.log(`  ✓ SystemConfig: ${dump.SystemConfig.length} registros inseridos.`);
    }

    // 2. City
    if (dump.City) {
      for (const c of dump.City) {
        await tx.city.upsert({
          where: { id: c.id },
          create: {
            id: c.id,
            name: c.name,
            stateCode: c.stateCode,
            slug: c.slug,
            latitude: c.latitude,
            longitude: c.longitude,
            ibgeCode: c.ibgeCode,
          },
          update: {},
        });
      }
      console.log(`  ✓ City: ${dump.City.length} registros inseridos.`);
    }

    // 3. Venue
    if (dump.Venue) {
      for (const v of dump.Venue) {
        await tx.venue.upsert({
          where: { id: v.id },
          create: {
            id: v.id,
            name: v.name,
            slug: v.slug,
            cityId: v.cityId,
            address: v.address,
            latitude: v.latitude,
            longitude: v.longitude,
          },
          update: {},
        });
      }
      console.log(`  ✓ Venue: ${dump.Venue.length} registros inseridos.`);
    }

    // 4. Source
    if (dump.Source) {
      for (const s of dump.Source) {
        await tx.source.upsert({
          where: { id: s.id },
          create: {
            id: s.id,
            name: s.name,
            url: s.url,
            sourceType: s.sourceType,
            trustLevel: s.trustLevel,
            lastVerifiedAt: s.lastVerifiedAt ? new Date(s.lastVerifiedAt) : null,
            reliabilityScore: s.reliabilityScore,
          },
          update: {},
        });
      }
      console.log(`  ✓ Source: ${dump.Source.length} registros inseridos.`);
    }

    // 5. Artist
    if (dump.Artist) {
      for (const a of dump.Artist) {
        await tx.artist.upsert({
          where: { id: a.id },
          create: {
            id: a.id,
            name: a.name,
            slug: a.slug,
            bio: a.bio,
            avatarUrl: a.avatarUrl,
            coverUrl: a.coverUrl,
            isDuoOrGroup: Boolean(a.isDuoOrGroup),
            genreTags: a.genreTags,
            spotifyId: a.spotifyId,
            youtubeChannel: a.youtubeChannel,
            instagramHandle: a.instagramHandle,
            tiktokHandle: a.tiktokHandle,
            isFeatured: Boolean(a.isFeatured),
            createdAt: a.createdAt ? new Date(a.createdAt) : new Date(),
            updatedAt: a.updatedAt ? new Date(a.updatedAt) : new Date(),
          },
          update: {},
        });
      }
      console.log(`  ✓ Artist: ${dump.Artist.length} registros inseridos.`);
    }

    // 6. Album
    if (dump.Album) {
      for (const al of dump.Album) {
        await tx.album.upsert({
          where: { id: al.id },
          create: {
            id: al.id,
            title: al.title,
            slug: al.slug,
            coverUrl: al.coverUrl,
            releaseDate: al.releaseDate ? new Date(al.releaseDate) : null,
            albumType: al.albumType,
            spotifyAlbumId: al.spotifyAlbumId,
          },
          update: {},
        });
      }
      console.log(`  ✓ Album: ${dump.Album.length} registros inseridos.`);
    }

    // 7. Music
    if (dump.Music) {
      for (const m of dump.Music) {
        await tx.music.upsert({
          where: { id: m.id },
          create: {
            id: m.id,
            title: m.title,
            slug: m.slug,
            durationSeconds: m.durationSeconds,
            releaseDate: m.releaseDate ? new Date(m.releaseDate) : null,
            spotifyTrackId: m.spotifyTrackId,
            youtubeVideoId: m.youtubeVideoId,
            isHit: Boolean(m.isHit),
            isPublished: Boolean(m.isPublished ?? false),
            albumId: m.albumId,
            createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
          },
          update: {},
        });
      }
      console.log(`  ✓ Music: ${dump.Music.length} registros inseridos.`);
    }

    // 8. MusicArtist
    if (dump.MusicArtist) {
      for (const ma of dump.MusicArtist) {
        await tx.musicArtist.upsert({
          where: { musicId_artistId: { musicId: ma.musicId, artistId: ma.artistId } },
          create: {
            musicId: ma.musicId,
            artistId: ma.artistId,
            isPrimary: Boolean(ma.isPrimary),
          },
          update: {},
        });
      }
      console.log(`  ✓ MusicArtist: ${dump.MusicArtist.length} registros inseridos.`);
    }

    // 9. Event
    if (dump.Event) {
      for (const e of dump.Event) {
        await tx.event.upsert({
          where: { id: e.id },
          create: {
            id: e.id,
            title: e.title,
            slug: e.slug,
            eventDate: new Date(e.eventDate),
            venueId: e.venueId,
            cityId: e.cityId,
            status: e.status,
            ticketUrl: e.ticketUrl,
            ticketMinPrice: e.ticketMinPrice,
            isHighlight: Boolean(e.isHighlight),
            isPublished: Boolean(e.isPublished ?? false),
            sourceId: e.sourceId,
            confidenceLevel: e.confidenceLevel,
            createdAt: e.createdAt ? new Date(e.createdAt) : new Date(),
            updatedAt: e.updatedAt ? new Date(e.updatedAt) : new Date(),
          },
          update: {},
        });
      }
      console.log(`  ✓ Event: ${dump.Event.length} registros inseridos.`);
    }

    // 10. EventArtist
    if (dump.EventArtist) {
      for (const ea of dump.EventArtist) {
        await tx.eventArtist.upsert({
          where: { eventId_artistId: { eventId: ea.eventId, artistId: ea.artistId } },
          create: {
            eventId: ea.eventId,
            artistId: ea.artistId,
            performanceOrder: ea.performanceOrder,
            stageName: ea.stageName,
          },
          update: {},
        });
      }
      console.log(`  ✓ EventArtist: ${dump.EventArtist.length} registros inseridos.`);
    }

    // 11. News
    if (dump.News) {
      for (const n of dump.News) {
        await tx.news.upsert({
          where: { id: n.id },
          create: {
            id: n.id,
            title: n.title,
            slug: n.slug,
            summary: n.summary,
            contentJson: n.contentJson,
            coverUrl: n.coverUrl,
            category: n.category,
            trustType: n.trustType,
            authorId: n.authorId,
            publishedAt: n.publishedAt ? new Date(n.publishedAt) : new Date(),
            isFeatured: Boolean(n.isFeatured),
            isPublished: Boolean(n.isPublished ?? false),
            createdAt: n.createdAt ? new Date(n.createdAt) : new Date(),
            updatedAt: n.updatedAt ? new Date(n.updatedAt) : new Date(),
          },
          update: {},
        });
      }
      console.log(`  ✓ News: ${dump.News.length} registros inseridos.`);
    }

    // 12. NewsArtist
    if (dump.NewsArtist) {
      for (const na of dump.NewsArtist) {
        await tx.newsArtist.upsert({
          where: { newsId_artistId: { newsId: na.newsId, artistId: na.artistId } },
          create: {
            newsId: na.newsId,
            artistId: na.artistId,
          },
          update: {},
        });
      }
      console.log(`  ✓ NewsArtist: ${dump.NewsArtist.length} registros inseridos.`);
    }

    // 13. NewsEvent
    if (dump.NewsEvent) {
      for (const ne of dump.NewsEvent) {
        await tx.newsEvent.upsert({
          where: { newsId_eventId: { newsId: ne.newsId, eventId: ne.eventId } },
          create: {
            newsId: ne.newsId,
            eventId: ne.eventId,
          },
          update: {},
        });
      }
      console.log(`  ✓ NewsEvent: ${dump.NewsEvent.length} registros inseridos.`);
    }

    // 14. NewsCity
    if (dump.NewsCity) {
      for (const nc of dump.NewsCity) {
        await tx.newsCity.upsert({
          where: { newsId_cityId: { newsId: nc.newsId, cityId: nc.cityId } },
          create: {
            newsId: nc.newsId,
            cityId: nc.cityId,
          },
          update: {},
        });
      }
      console.log(`  ✓ NewsCity: ${dump.NewsCity.length} registros inseridos.`);
    }

    // 15. ChartEntry
    if (dump.ChartEntry) {
      for (const ce of dump.ChartEntry) {
        await tx.chartEntry.upsert({
          where: { period_position: { period: ce.period, position: ce.position } },
          create: {
            id: ce.id,
            period: ce.period,
            position: ce.position,
            artistName: ce.artistName,
            songTitle: ce.songTitle,
            artistId: ce.artistId,
            musicId: ce.musicId,
            isPublished: Boolean(ce.isPublished ?? false),
            createdAt: ce.createdAt ? new Date(ce.createdAt) : new Date(),
            updatedAt: ce.updatedAt ? new Date(ce.updatedAt) : new Date(),
          },
          update: {},
        });
      }
      console.log(`  ✓ ChartEntry: ${dump.ChartEntry.length} registros inseridos.`);
    }
  }, { timeout: 60000 });

  console.log('🎉 Seed transacional concluído com 100% de sucesso!');
}

main()
  .catch((err) => {
    console.error('❌ Falha no seed (transação revertida automaticamente):', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
