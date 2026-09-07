import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

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

function validateCharts(dataDir: string) {
  const filePath = path.join(dataDir, 'mais-tocadas.json');
  const charts = readJson<ChartsSeed>(filePath);

  if (!charts) {
    console.log('ℹ️ data/mais-tocadas.json não encontrado.');
    return;
  }

  const entries = [...(charts.semana ?? []), ...(charts.ano ?? [])];
  for (const item of entries) {
    if (!Number.isInteger(item.posicao) || item.posicao < 1 || !item.artista || !item.musica) {
      throw new Error(`Entrada inválida em data/mais-tocadas.json: ${JSON.stringify(item)}`);
    }
  }

  console.log(`ℹ️ mais-tocadas.json validado: ${entries.length} entradas. Persistência do ranking será implementada com o modelo de charts.`);
}

async function main() {
  console.log('🌱 Seed Onda Sertaneja — fonte estruturada em /data');
  console.log('📌 Regra: o seed nunca cria artista automaticamente.');

  const rootDir = path.resolve(__dirname, '..');
  const dataDir = path.join(rootDir, 'data');

  if (!fs.existsSync(dataDir)) {
    throw new Error(`Diretório de dados não encontrado: ${dataDir}`);
  }

  await seedShows(dataDir);
  await seedReleases(dataDir);
  validateCharts(dataDir);

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
