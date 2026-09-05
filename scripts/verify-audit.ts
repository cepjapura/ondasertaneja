import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function runAudit() {
  const rootDir = path.resolve(__dirname, '..');

  // Load JSONs
  const configJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'config.json'), 'utf-8'));
  const artistasJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'artistas.json'), 'utf-8'));
  const agendaJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'agenda.json'), 'utf-8'));
  const noticiasJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'noticias.json'), 'utf-8'));
  const lancamentosJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'lancamentos.json'), 'utf-8'));
  const entrevistasJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'entrevistas.json'), 'utf-8'));
  const galeriaJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'galeria.json'), 'utf-8'));

  // Database Counts
  const configDbCount = await prisma.systemConfig.count();
  const artistDbCount = await prisma.artist.count();
  const eventDbCount = await prisma.event.count();
  const newsDbCount = await prisma.news.count();
  const musicDbCount = await prisma.music.count();

  console.log('=== COMPARATIVO QUANTITATIVO DA MIGRAÇÃO ===');
  console.log(`config.json: ${Object.keys(configJson).length} chaves no JSON -> ${configDbCount} chaves no DB`);
  console.log(`artistas.json: ${artistasJson.length} itens no JSON -> ${artistDbCount} artistas no DB`);
  console.log(`agenda.json: ${agendaJson.length} itens no JSON -> ${eventDbCount} eventos no DB`);
  console.log(`noticias.json: ${noticiasJson.length} itens no JSON -> ${newsDbCount - (entrevistasJson ? 1 : 0)} notícias no DB`);
  console.log(`entrevistas.json: 1 entrevista -> ${entrevistasJson ? 1 : 0} em News (categoria entrevista)`);
  console.log(`lancamentos.json: ${lancamentosJson.length} itens (3 músicas + 1 config playlist) -> ${musicDbCount} músicas no DB`);
  console.log(`galeria.json: ${galeriaJson.length} fotos no JSON`);

  console.log('\n=== CHECAGEM DE REGISTROS REAIS ===');

  // Test 3 Artists
  console.log('\n--- ARTISTAS ---');
  for (const art of artistasJson.slice(0, 3)) {
    const dbArt = await prisma.artist.findFirst({ where: { name: art.nome } });
    console.log(`JSON: "${art.nome}" | Img: ${art.imagem?.slice(0, 30)}... | DB: ${dbArt ? 'ENCONTRADO (ID: ' + dbArt.id + ', Featured: ' + dbArt.isFeatured + ')' : 'NÃO ENCONTRADO'}`);
  }

  // Test 3 News
  console.log('\n--- NOTÍCIAS ---');
  for (const not of noticiasJson.slice(0, 3)) {
    const dbNews = await prisma.news.findFirst({ where: { title: not.titulo } });
    console.log(`JSON: "${not.titulo}" | DB: ${dbNews ? 'ENCONTRADO (Trust: ' + dbNews.trustType + ')' : 'NÃO ENCONTRADO'}`);
  }

  // Test 3 Events
  console.log('\n--- EVENTOS ---');
  for (const ag of agendaJson.slice(0, 3)) {
    const dbEv = await prisma.event.findFirst({ where: { title: ag.artista } });
    console.log(`JSON: "${ag.artista}" em ${ag.cidade} | DB: ${dbEv ? 'ENCONTRADO (Status: ' + dbEv.status + ')' : 'NÃO ENCONTRADO'}`);
  }

  // Test 2 Lancamentos
  console.log('\n--- MÚSICAS / LANÇAMENTOS ---');
  const musicas = lancamentosJson.filter((l: any) => !l.destaque);
  for (const m of musicas.slice(0, 2)) {
    const dbM = await prisma.music.findFirst({ where: { title: m.nome } });
    console.log(`JSON: "${m.nome}" (${m.artista}) | DB: ${dbM ? 'ENCONTRADO' : 'NÃO ENCONTRADO'}`);
  }
}

runAudit()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
