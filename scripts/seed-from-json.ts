import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

type ArtistSeed = {
  nome: string;
  slug?: string;
  imagem?: string;
  destaque?: boolean;
};

type ShowSeed = {
  artista: string;
  cidade: string;
  data: string;
  local: string;
  link?: string;
  destaque?: boolean;
  patrocinado?: boolean;
};

type ReleaseSeed = {
  artista: string;
  musica: string;
  capa?: string;
  link?: string;
  destaque?: boolean;
  patrocinado?: boolean;
};

type NewsSeed = {
  slug: string;
  titulo: string;
  resumo: string;
  conteudo?: string[];
  imagem?: string;
  categoria?: string;
  destaque?: boolean;
  artistas?: string[];
  cidades?: string[];
  eventos?: string[];
};

type ChartEntrySeed = {
  posicao: number;
  artista: string;
  musica: string;
};

type ChartsSeed = {
  semana?: ChartEntrySeed[];
  ano?: ChartEntrySeed[];
};

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

function readJson<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

function parseDate(value: string): Date {
  const trimmed = value.trim();

  // ISO: YYYY-MM-DD
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12, 0, 0);
  }

  // BR: DD/MM/YYYY
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (br) {
    return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]), 12, 0, 0);
  }

  throw new Error(`Data inválida: "${value}". Use YYYY-MM-DD ou DD/MM/YYYY.`);
}

function splitCity(value: string): { name: string; stateCode: string } {
  const parts = value.split(/\s*-\s*/);
  const stateCode = parts.length > 1 ? parts.pop()!.trim().toUpperCase() : '';
  const name = parts.join(' - ').trim();

  if (!name || !stateCode) {
    throw new Error(`Cidade inválida: "${value}". Use "Cidade - UF".`);
  }

  return { name, stateCode };
}

function extractSpotifyTrackId(link?: string): string | undefined {
  if (!link) return undefined;
  const match = link.match(/open\.spotify\.com\/track\/([A-Za-z0-9]+)/i);
  return match?.[1];
}

async function findArtistByName(name: string) {
  const artist = await prisma.artist.findUnique({ where: { slug: slugify(name) } });

  if (!artist) {
    console.warn(`⚠️ Artista não cadastrado: "${name}". Registro não será criado automaticamente.`);
  }

  return artist;
}

async function seedArtists(dataDir: string) {
  const filePath = path.join(dataDir, 'artistas.json');
  const artists = readJson<ArtistSeed[]>(filePath);

  if (!artists) {
    console.log('ℹ️ data/artistas.json não encontrado. Nenhum artista importado.');
    return;
  }

  let imported = 0;

  for (const item of artists) {
    if (!item.nome) {
      throw new Error(`Artista inválido em data/artistas.json: ${JSON.stringify(item)}`);
    }

    const artistSlug = item.slug ?? slugify(item.nome);

    await prisma.artist.upsert({
      where: { slug: artistSlug },
      update: {
        name: item.nome,
        avatarUrl: item.imagem ?? null,
        isFeatured: item.destaque ?? false,
      },
      create: {
        name: item.nome,
        slug: artistSlug,
        avatarUrl: item.imagem ?? null,
        isFeatured: item.destaque ?? false,
      },
    });

    imported++;
  }

  console.log(`✅ ${imported} artistas cadastrados via data/artistas.json.`);
}

async function seedShows(dataDir: string) {
  const filePath = path.join(dataDir, 'shows.json');
  const shows = readJson<ShowSeed[]>(filePath);

  if (!shows) {
    console.log('ℹ️ data/shows.json não encontrado. Nenhum show importado.');
    return;
  }

  let imported = 0;
  let unresolvedArtists = 0;

  for (const item of shows) {
    if (!item.artista || !item.cidade || !item.data || !item.local) {
      throw new Error(`Show inválido em data/shows.json: ${JSON.stringify(item)}`);
    }

    const { name: cityName, stateCode } = splitCity(item.cidade);
    const citySlug = slugify(`${cityName}-${stateCode}`);

    const city = await prisma.city.upsert({
      where: { slug: citySlug },
      update: { name: cityName, stateCode },
      create: { name: cityName, stateCode, slug: citySlug },
    });

    const venueSlug = slugify(`${item.local}-${citySlug}`);
    const venue = await prisma.venue.upsert({
      where: { slug: venueSlug },
      update: { name: item.local, cityId: city.id },
      create: { name: item.local, slug: venueSlug, cityId: city.id },
    });

    const eventDate = parseDate(item.data);
    const eventSlug = slugify(`${item.artista}-${item.data}-${citySlug}-${item.local}`);

    const event = await prisma.event.upsert({
      where: { slug: eventSlug },
      update: {
        title: item.artista,
        eventDate,
        venueId: venue.id,
        cityId: city.id,
        isHighlight: item.destaque ?? false,
        confidenceLevel: 'unverified',
        sourceId: null,
      },
      create: {
        title: item.artista,
        slug: eventSlug,
        eventDate,
        venueId: venue.id,
        cityId: city.id,
        isHighlight: item.destaque ?? false,
        status: 'confirmed',
        confidenceLevel: 'unverified',
      },
    });

    const artist = await findArtistByName(item.artista);

    if (!artist) {
      unresolvedArtists++;
      continue;
    }

    await prisma.eventArtist.upsert({
      where: {
        eventId_artistId: { eventId: event.id, artistId: artist.id },
      },
      update: {},
      create: { eventId: event.id, artistId: artist.id },
    });

    imported++;
  }

  console.log(`✅ ${shows.length} shows processados (${imported} com artista vinculado).`);
  if (unresolvedArtists > 0) {
    console.warn(`⚠️ ${unresolvedArtists} shows ficaram sem vínculo de artista porque o artista não existe no banco.`);
  }
}

async function seedReleases(dataDir: string) {
  const filePath = path.join(dataDir, 'lancamentos.json');
  const releases = readJson<ReleaseSeed[]>(filePath);

  if (!releases) {
    console.log('ℹ️ data/lancamentos.json não encontrado. Nenhum lançamento importado.');
    return;
  }

  let linked = 0;
  let unresolvedArtists = 0;

  for (const item of releases) {
    if (!item.artista || !item.musica) {
      throw new Error(`Lançamento inválido em data/lancamentos.json: ${JSON.stringify(item)}`);
    }

    const artist = await findArtistByName(item.artista);
    if (!artist) {
      unresolvedArtists++;
      continue;
    }

    const musicSlug = slugify(`${item.musica}-${item.artista}`);
    const spotifyTrackId = extractSpotifyTrackId(item.link);

    let albumId: string | undefined;

    // A capa pertence ao lançamento. Como Music não possui coverUrl,
    // usamos Album como entidade de capa para singles, sem inventar metadados externos.
    if (item.capa) {
      const albumSlug = slugify(`${item.musica}-${item.artista}-single`);
      const album = await prisma.album.upsert({
        where: { slug: albumSlug },
        update: { title: item.musica, coverUrl: item.capa, albumType: 'single' },
        create: {
          title: item.musica,
          slug: albumSlug,
          coverUrl: item.capa,
          albumType: 'single',
        },
      });
      albumId = album.id;
    }

    const music = await prisma.music.upsert({
      where: { slug: musicSlug },
      update: {
        title: item.musica,
        isHit: item.destaque ?? false,
        spotifyTrackId,
        albumId,
      },
      create: {
        title: item.musica,
        slug: musicSlug,
        isHit: item.destaque ?? false,
        spotifyTrackId,
        albumId,
      },
    });

    await prisma.musicArtist.upsert({
      where: { musicId_artistId: { musicId: music.id, artistId: artist.id } },
      update: {},
      create: { musicId: music.id, artistId: artist.id, isPrimary: true },
    });

    linked++;
  }

  console.log(`✅ ${releases.length} lançamentos processados (${linked} vinculados a artistas existentes).`);
  if (unresolvedArtists > 0) {
    console.warn(`⚠️ ${unresolvedArtists} lançamentos não foram criados porque o artista não existe no banco.`);
  }
}

async function seedNews(dataDir: string) {
  const filePath = path.join(dataDir, 'noticias.json');
  const newsList = readJson<NewsSeed[]>(filePath);

  if (!newsList) {
    console.log('ℹ️ data/noticias.json não encontrado. Nenhuma notícia importada.');
    return;
  }

  let imported = 0;
  let unresolvedRelations = 0;

  for (const item of newsList) {
    if (!item.titulo || !item.slug || !item.resumo) {
      throw new Error(`Notícia inválida em data/noticias.json: ${JSON.stringify(item)}`);
    }

    const contentJson = JSON.stringify(item.conteudo || [item.resumo]);

    const news = await prisma.news.upsert({
      where: { slug: item.slug },
      update: {
        title: item.titulo,
        summary: item.resumo,
        contentJson,
        coverUrl: item.imagem ?? null,
        category: item.categoria ?? 'news',
        isFeatured: item.destaque ?? false,
      },
      create: {
        title: item.titulo,
        slug: item.slug,
        summary: item.resumo,
        contentJson,
        coverUrl: item.imagem ?? null,
        category: item.categoria ?? 'news',
        trustType: 'confirmed',
        isFeatured: item.destaque ?? false,
      },
    });

    if (item.artistas && Array.isArray(item.artistas)) {
      for (const artistSlug of item.artistas) {
        const artist = await prisma.artist.findUnique({ where: { slug: artistSlug } });
        if (!artist) {
          console.warn(`⚠️ Artista com slug "${artistSlug}" não encontrado para notícia "${item.slug}". Vínculo ignorado.`);
          unresolvedRelations++;
          continue;
        }
        await prisma.newsArtist.upsert({
          where: { newsId_artistId: { newsId: news.id, artistId: artist.id } },
          update: {},
          create: { newsId: news.id, artistId: artist.id },
        });
      }
    }

    if (item.cidades && Array.isArray(item.cidades)) {
      for (const citySlug of item.cidades) {
        const city = await prisma.city.findUnique({ where: { slug: citySlug } });
        if (!city) {
          console.warn(`⚠️ Cidade com slug "${citySlug}" não encontrada para notícia "${item.slug}". Vínculo ignorado.`);
          unresolvedRelations++;
          continue;
        }
        await prisma.newsCity.upsert({
          where: { newsId_cityId: { newsId: news.id, cityId: city.id } },
          update: {},
          create: { newsId: news.id, cityId: city.id },
        });
      }
    }

    if (item.eventos && Array.isArray(item.eventos)) {
      for (const eventSlug of item.eventos) {
        const event = await prisma.event.findUnique({ where: { slug: eventSlug } });
        if (!event) {
          console.warn(`⚠️ Evento com slug "${eventSlug}" não encontrado para notícia "${item.slug}". Vínculo ignorado.`);
          unresolvedRelations++;
          continue;
        }
        await prisma.newsEvent.upsert({
          where: { newsId_eventId: { newsId: news.id, eventId: event.id } },
          update: {},
          create: { newsId: news.id, eventId: event.id },
        });
      }
    }

    imported++;
  }

  console.log(`✅ ${newsList.length} notícias/entrevistas processadas (${imported} upsertadas).`);
  if (unresolvedRelations > 0) {
    console.warn(`⚠️ ${unresolvedRelations} vínculos editoriais foram ignorados pois as entidades relacionadas não existem no banco.`);
  }
}

async function seedCharts(dataDir: string) {
  const filePath = path.join(dataDir, 'mais-tocadas.json');
  const charts = readJson<ChartsSeed>(filePath);

  if (!charts) {
    console.log('ℹ️ data/mais-tocadas.json não encontrado. Nenhum chart importado.');
    return;
  }

  const periods: Array<{ key: 'semana' | 'ano'; items?: ChartEntrySeed[] }> = [
    { key: 'semana', items: charts.semana },
    { key: 'ano', items: charts.ano },
  ];

  let totalEntries = 0;
  let resolvedArtists = 0;
  let resolvedMusics = 0;
  let unlinkedEntries = 0;

  for (const { key, items } of periods) {
    if (!items || !Array.isArray(items)) continue;

    for (const item of items) {
      if (!Number.isInteger(item.posicao) || item.posicao < 1 || !item.artista || !item.musica) {
        throw new Error(`Entrada inválida em data/mais-tocadas.json (${key}): ${JSON.stringify(item)}`);
      }

      const artist = await prisma.artist.findUnique({
        where: { slug: slugify(item.artista) },
      });

      const music = await prisma.music.findFirst({
        where: { title: item.musica },
      });

      if (artist) resolvedArtists++;
      if (music) resolvedMusics++;
      if (!artist && !music) unlinkedEntries++;

      await prisma.chartEntry.upsert({
        where: {
          period_position: {
            period: key,
            position: item.posicao,
          },
        },
        update: {
          artistName: item.artista,
          songTitle: item.musica,
          artistId: artist?.id ?? null,
          musicId: music?.id ?? null,
        },
        create: {
          period: key,
          position: item.posicao,
          artistName: item.artista,
          songTitle: item.musica,
          artistId: artist?.id ?? null,
          musicId: music?.id ?? null,
        },
      });

      totalEntries++;
    }
  }

  console.log(`✅ ${totalEntries} entradas do ranking ("mais-tocadas.json") processadas com sucesso.`);
  console.log(`ℹ️ Resolução: ${resolvedArtists} artistas vinculados, ${resolvedMusics} músicas vinculadas, ${unlinkedEntries} mantidas sem vínculo.`);
}

async function main() {
  console.log('🌱 Seed Onda Sertaneja — fonte estruturada em /data');
  console.log('📌 Regra: o seed nunca cria artista automaticamente.');

  const rootDir = path.resolve(__dirname, '..');
  const dataDir = path.join(rootDir, 'data');

  if (!fs.existsSync(dataDir)) {
    throw new Error(`Diretório de dados não encontrado: ${dataDir}`);
  }

  await seedArtists(dataDir);
  await seedShows(dataDir);
  await seedReleases(dataDir);
  await seedNews(dataDir);
  await seedCharts(dataDir);

  console.log('🎉 Seed concluído sem criação artificial de artistas, fontes ou conteúdo legado.');
}

main()
  .catch((error) => {
    console.error('❌ Erro no seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
