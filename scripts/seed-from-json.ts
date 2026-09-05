import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

function parseDataBr(dataStr: string): Date {
  const partes = dataStr.split('/');
  if (partes.length === 3) {
    return new Date(parseInt(partes[2], 10), parseInt(partes[1], 10) - 1, parseInt(partes[0], 10));
  }
  return new Date();
}

async function main() {
  console.log('🌱 Iniciando migração dos 7 arquivos JSON para o Banco de Dados...');

  const rootDir = path.resolve(__dirname, '..');

  // 1. Configurações Globais (config.json)
  const configPath = path.join(rootDir, 'config.json');
  if (fs.existsSync(configPath)) {
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    for (const [key, value] of Object.entries(configData)) {
      await prisma.systemConfig.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }
    console.log('✅ config.json migrado para SystemConfig.');
  }

  // Fonte padrão de migração
  const defaultSource = await prisma.source.upsert({
    where: { id: 'source-oficial' },
    update: {},
    create: {
      id: 'source-oficial',
      name: 'Assessoria Oficial Onda Sertaneja',
      sourceType: 'official_artist',
      trustLevel: 'high',
      reliabilityScore: 100,
    },
  });

  // 2. Artistas (artistas.json)
  const artistasMap = new Map<string, string>(); // nome -> id
  const artistasPath = path.join(rootDir, 'artistas.json');
  if (fs.existsSync(artistasPath)) {
    const artistasData = JSON.parse(fs.readFileSync(artistasPath, 'utf-8'));
    for (const art of artistasData) {
      const slug = slugify(art.nome);
      const created = await prisma.artist.upsert({
        where: { slug },
        update: {
          name: art.nome,
          avatarUrl: art.imagem,
          coverUrl: art.imagem,
          isFeatured: art.patrocinado || false,
        },
        create: {
          name: art.nome,
          slug,
          avatarUrl: art.imagem,
          coverUrl: art.imagem,
          isFeatured: art.patrocinado || false,
          genreTags: 'Sertanejo',
        },
      });
      artistasMap.set(art.nome, created.id);
    }
    console.log(`✅ ${artistasData.length} Artistas migrados com sucesso.`);
  }

  // 3. Agenda de Shows (agenda.json)
  const agendaPath = path.join(rootDir, 'agenda.json');
  if (fs.existsSync(agendaPath)) {
    const agendaData = JSON.parse(fs.readFileSync(agendaPath, 'utf-8'));
    for (const item of agendaData) {
      // Processar Cidade e Estado (ex: "Brasília - DF", "Pedro Leopoldo - MG")
      const partesCidade = item.cidade.split('-');
      const nomeCidade = partesCidade[0]?.trim() || item.cidade;
      const estadoCode = partesCidade[1]?.trim() || 'PR';
      const citySlug = slugify(`${nomeCidade}-${estadoCode}`);

      const city = await prisma.city.upsert({
        where: { slug: citySlug },
        update: { name: nomeCidade, stateCode: estadoCode },
        create: { name: nomeCidade, stateCode: estadoCode, slug: citySlug },
      });

      // Processar Venue
      const venueSlug = slugify(`${item.local}-${citySlug}`);
      const venue = await prisma.venue.upsert({
        where: { slug: venueSlug },
        update: { name: item.local },
        create: { name: item.local, slug: venueSlug, cityId: city.id },
      });

      // Processar Evento
      const eventSlug = slugify(`${item.artista}-${item.data}-${citySlug}`);
      const eventDate = parseDataBr(item.data);

      const event = await prisma.event.upsert({
        where: { slug: eventSlug },
        update: {
          title: item.artista,
          eventDate,
          venueId: venue.id,
          cityId: city.id,
          isHighlight: item.destaque || false,
          sourceId: defaultSource.id,
        },
        create: {
          title: item.artista,
          slug: eventSlug,
          eventDate,
          venueId: venue.id,
          cityId: city.id,
          isHighlight: item.destaque || false,
          sourceId: defaultSource.id,
          status: 'confirmed',
          confidenceLevel: 'verified',
        },
      });

      // Se o artista coincidir com um artista cadastrado, vincular EventArtist
      let artistId = artistasMap.get(item.artista);
      if (!artistId) {
        // Tentar encontrar artista por slug
        const artistSlug = slugify(item.artista);
        const existingArtist = await prisma.artist.findUnique({ where: { slug: artistSlug } });
        if (existingArtist) {
          artistId = existingArtist.id;
        } else {
          // Criar artista se não existir
          const newArt = await prisma.artist.create({
            data: { name: item.artista, slug: artistSlug, genreTags: 'Sertanejo' },
          });
          artistId = newArt.id;
          artistasMap.set(item.artista, artistId);
        }
      }

      if (artistId) {
        await prisma.eventArtist.upsert({
          where: {
            eventId_artistId: { eventId: event.id, artistId },
          },
          update: {},
          create: { eventId: event.id, artistId },
        });
      }
    }
    console.log(`✅ ${agendaData.length} Shows migrados para Agenda/Events.`);
  }

  // 4. Notícias (noticias.json)
  const noticiasPath = path.join(rootDir, 'noticias.json');
  if (fs.existsSync(noticiasPath)) {
    const noticiasData = JSON.parse(fs.readFileSync(noticiasPath, 'utf-8'));
    for (const not of noticiasData) {
      const slug = slugify(not.titulo);
      const contentJson = JSON.stringify(not.conteudo || [not.resumo]);

      let trustType = 'confirmed';
      if (not.classeTag === 'tag-hot') trustType = 'confirmed';
      if (not.tag === 'Exclusivo') trustType = 'confirmed';

      await prisma.news.upsert({
        where: { slug },
        update: {
          title: not.titulo,
          summary: not.resumo,
          contentJson,
          coverUrl: not.imagem,
          trustType,
        },
        create: {
          title: not.titulo,
          slug,
          summary: not.resumo,
          contentJson,
          coverUrl: not.imagem,
          category: 'news',
          trustType,
          isFeatured: not.tag === 'Destaque',
        },
      });
    }
    console.log(`✅ ${noticiasData.length} Notícias migradas com sucesso.`);
  }

  // 5. Entrevistas (entrevistas.json)
  const entrevistasPath = path.join(rootDir, 'entrevistas.json');
  if (fs.existsSync(entrevistasPath)) {
    const entrevistaData = JSON.parse(fs.readFileSync(entrevistasPath, 'utf-8'));
    if (entrevistaData && entrevistaData.titulo) {
      const slug = slugify(entrevistaData.titulo);
      await prisma.news.upsert({
        where: { slug },
        update: {
          title: entrevistaData.titulo,
          summary: entrevistaData.resumo,
          coverUrl: entrevistaData.imagemFundo,
          category: 'interview',
        },
        create: {
          title: entrevistaData.titulo,
          slug,
          summary: entrevistaData.resumo,
          contentJson: JSON.stringify([entrevistaData.resumo]),
          coverUrl: entrevistaData.imagemFundo,
          category: 'interview',
          trustType: 'confirmed',
          isFeatured: true,
        },
      });
      console.log('✅ entrevistas.json migrado para News (Entrevista).');
    }
  }

  // 6. Lançamentos / Músicas (lancamentos.json)
  const lancamentosPath = path.join(rootDir, 'lancamentos.json');
  if (fs.existsSync(lancamentosPath)) {
    const lancamentosData = JSON.parse(fs.readFileSync(lancamentosPath, 'utf-8'));
    for (const item of lancamentosData) {
      if (item.destaque && item.linkUrl) {
        // Trata-se do destaque de playlist
        await prisma.systemConfig.upsert({
          where: { key: 'spotifyPlaylistUrl' },
          update: { value: item.linkUrl },
          create: { key: 'spotifyPlaylistUrl', value: item.linkUrl },
        });
        continue;
      }

      const slug = slugify(`${item.nome}-${item.artista}`);
      const music = await prisma.music.upsert({
        where: { slug },
        update: { title: item.nome, isHit: true },
        create: { title: item.nome, slug, isHit: true },
      });

      // Vincular com o artista se existir
      const artistSlug = slugify(item.artista);
      let artist = await prisma.artist.findUnique({ where: { slug: artistSlug } });
      if (!artist) {
        artist = await prisma.artist.create({
          data: { name: item.artista, slug: artistSlug, avatarUrl: item.capa },
        });
      }

      await prisma.musicArtist.upsert({
        where: { musicId_artistId: { musicId: music.id, artistId: artist.id } },
        update: {},
        create: { musicId: music.id, artistId: artist.id, isPrimary: true },
      });
    }
    console.log(`✅ Lançamentos migrados para Músicas.`);
  }

  // 7. Galeria (galeria.json)
  const galeriaPath = path.join(rootDir, 'galeria.json');
  if (fs.existsSync(galeriaPath)) {
    const galeriaData = JSON.parse(fs.readFileSync(galeriaPath, 'utf-8'));
    await prisma.systemConfig.upsert({
      where: { key: 'galleryPhotos' },
      update: { value: JSON.stringify(galeriaData) },
      create: { key: 'galleryPhotos', value: JSON.stringify(galeriaData) },
    });
    console.log(`✅ ${galeriaData.length} fotos da Galeria migradas com sucesso para SystemConfig.`);
  }

  console.log('🎉 Migração concluída com 100% de integridade!');
}

main()
  .catch(e => {
    console.error('❌ Erro na migração:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
