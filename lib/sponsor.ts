import { prisma } from './prisma';
import { getStartOfDaySaoPaulo } from './dates';

export interface SponsorClickStats {
  today: number;
  last7Days: number;
  currentMonth: number;
  previousMonth: number;
}

/**
 * Validação estrita da URL do patrocinador.
 * Exigência: deve ser estritamente HTTPS e URL válida.
 * Campo vazio retorna string vazia (sem link).
 */
export function validateSponsorUrl(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Link do patrocinador inválido. Digite uma URL completa, ex.: https://exemplo.com.br');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('O link do patrocinador deve usar obrigatoriamente o protocolo HTTPS (https://).');
  }

  // Previne placeholders óbvios
  const lower = trimmed.toLowerCase();
  if (lower.includes('seu_link') || lower.includes('exemplo.com') || lower.includes('link_aqui')) {
    throw new Error('Link de patrocinador inválido (placeholder detectado).');
  }

  return trimmed;
}

/**
 * Registra um clique no patrocinador (sem dados pessoais, sem IP nem cookies).
 */
export async function recordSponsorClick(sponsorSlug: string = 'alessandro-mioto'): Promise<void> {
  try {
    await prisma.sponsorClick.create({
      data: {
        sponsorSlug: sponsorSlug || 'alessandro-mioto',
        clickedAt: new Date(),
      },
    });
  } catch (err) {
    // Falha silenciosa para não travar a experiência do usuário
    console.error('[SponsorClick] Falha ao registrar clique:', err);
  }
}

/**
 * Obtém estatísticas consolidadas de cliques no patrocinador:
 * - hoje (horário de Brasília)
 * - últimos 7 dias
 * - mês atual (desde o dia 1 do mês corrente no horário de Brasília)
 * - mês passado (do dia 1 ao último dia do mês anterior no horário de Brasília)
 */
export async function getSponsorClickStats(sponsorSlug: string = 'alessandro-mioto'): Promise<SponsorClickStats> {
  const now = new Date();

  // 1. Início de hoje no fuso de São Paulo
  const startOfToday = getStartOfDaySaoPaulo(now);

  // 2. Últimos 7 dias (últimas 168 horas)
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // 3. Mês atual e Mês passado no fuso de São Paulo
  const spFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = spFormatter.format(now).split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);

  const startOfCurrentMonth = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00-03:00`);

  let prevYear = year;
  let prevMonth = month - 1;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }
  const startOfPreviousMonth = new Date(`${prevYear}-${String(prevMonth).padStart(2, '0')}-01T00:00:00-03:00`);

  // Executa os 4 counts em paralelo
  const [today, last7, currMonth, prevMonthCount] = await Promise.all([
    prisma.sponsorClick.count({
      where: {
        sponsorSlug,
        clickedAt: { gte: startOfToday },
      },
    }),
    prisma.sponsorClick.count({
      where: {
        sponsorSlug,
        clickedAt: { gte: last7Days },
      },
    }),
    prisma.sponsorClick.count({
      where: {
        sponsorSlug,
        clickedAt: { gte: startOfCurrentMonth },
      },
    }),
    prisma.sponsorClick.count({
      where: {
        sponsorSlug,
        clickedAt: {
          gte: startOfPreviousMonth,
          lt: startOfCurrentMonth,
        },
      },
    }),
  ]);

  return {
    today,
    last7Days: last7,
    currentMonth: currMonth,
    previousMonth: prevMonthCount,
  };
}
