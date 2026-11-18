import { prisma } from './prisma';
import {
  fetchRecentUploadsWithPagination,
  batchFetchVideoDetailsWithAudit,
  hasBlockedTitle,
  VideoCandidate,
  RawUploadVideo,
} from './youtube';

export interface DiscardCounts {
  outOfWindow: number;          // fora da janela
  isShortOrVertical: number;    // Short (vertical ou #shorts)
  under60s: number;             // menos de 60s
  over10m: number;              // mais de 10 min
  notMusicCategory: number;     // categoria diferente de Música
  liveOrPremiere: number;       // live/estreia
  notEmbeddable: number;        // não incorporável
  blockedTitle: number;         // título bloqueado
  duplicate: number;            // repetido
  channelLimit: number;         // limite por canal
  inTopVideos: number;          // já está em Top Vídeos
}

export interface SyncAuditStats {
  totalRead: number;
  selected: number;
  fallbackAdded?: number;
  windowDays: number;
  quotaCost: number;
  discards: DiscardCounts;
}

export interface SyncResult {
  ok: boolean;
  weekIdentifier: string;
  videosFound: number;
  videosSelected: number;
  windowDays?: number;
  quotaCost?: number;
  stats?: SyncAuditStats;
  status: 'DRAFT' | 'PUBLISHED' | 'SKIPPED';
  message: string;
}

export function formatRaioX(stats: SyncAuditStats): string {
  const d = stats.discards;
  const totalDiscards = Object.values(d).reduce((a, b) => a + b, 0);
  const isBalanced = stats.totalRead === stats.selected + totalDiscards;
  const fallbackNote = stats.fallbackAdded && stats.fallbackAdded > 0
    ? ` (+ ${stats.fallbackAdded} da playlist anterior para fechar o mínimo de 20)`
    : '';

  return [
    `Raio-X da Execução (${stats.totalRead} vídeos lidos • Cota da API gasta: ${stats.quotaCost} unidades):`,
    `• Fora da janela: ${d.outOfWindow}`,
    `• Short (vertical ou #shorts): ${d.isShortOrVertical}`,
    `• Menos de 60s: ${d.under60s}`,
    `• Mais de 10 min: ${d.over10m}`,
    `• Categoria diferente de Música: ${d.notMusicCategory}`,
    `• Live/estreia: ${d.liveOrPremiere}`,
    `• Não incorporável: ${d.notEmbeddable}`,
    `• Título bloqueado: ${d.blockedTitle}`,
    `• Repetido: ${d.duplicate}`,
    `• Limite por canal: ${d.channelLimit}`,
    `• Já está em Top Vídeos: ${d.inTopVideos}`,
    `${isBalanced ? '✓' : '⚠️'} Conferência: ${stats.totalRead} lidos = ${stats.selected} selecionados + ${totalDiscards} descartados${fallbackNote}`,
  ].join('\n');
}

/**
 * Calcula o identificador ISO da semana no fuso de Brasília (ex.: 2026-W47).
 */
export function getCurrentWeekIdentifier(date: Date = new Date()): string {
  const spDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const d = new Date(Date.UTC(spDate.getFullYear(), spDate.getMonth(), spDate.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Extrai o ID do YouTube de uma URL para verificação contra Top Vídeos.
 */
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/i);
  return match ? match[1] : null;
}

/**
 * Intercala uma lista de vídeos por canal (estilo rodízio: 1 de cada artista/canal por vez),
 * evitando duas músicas seguidas do mesmo canal sempre que possível.
 * Mantém dentro de cada canal a ordem do mais recente para o mais antigo.
 */
export function interleaveVideosByChannel(videos: VideoCandidate[]): VideoCandidate[] {
  if (videos.length <= 1) return [...videos];

  // 1. Agrupa por canal preservando a ordem
  const byChannel = new Map<string, VideoCandidate[]>();
  for (const v of videos) {
    const key = v.channelId || v.channelTitle || 'unknown';
    const list = byChannel.get(key) || [];
    list.push(v);
    byChannel.set(key, list);
  }

  // 2. Ordena os vídeos dentro de cada canal: do mais recente para o mais antigo
  for (const list of byChannel.values()) {
    list.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  }

  // 3. Ordena os canais pelo lançamento mais recente do primeiro vídeo de cada um
  const queues = Array.from(byChannel.values());
  queues.sort((a, b) => b[0].publishedAt.getTime() - a[0].publishedAt.getTime());

  // 4. Rodízio inteligente (1 por canal a cada volta, evitando canais repetidos consecutivos)
  const result: VideoCandidate[] = [];
  let remainingCount = videos.length;

  while (remainingCount > 0) {
    let progressed = false;

    for (let qIdx = 0; qIdx < queues.length; qIdx++) {
      const q = queues[qIdx];
      if (q.length === 0) continue;

      const lastChannel = result.length > 0
        ? (result[result.length - 1].channelId || result[result.length - 1].channelTitle)
        : null;
      const currentChannel = q[0].channelId || q[0].channelTitle;

      // Se este canal for igual ao último adicionado e houver outro canal com música disponível,
      // prioriza o outro canal para evitar repetições consecutivas
      if (lastChannel && currentChannel === lastChannel) {
        const otherQueue = queues.find(other => other !== q && other.length > 0);
        if (otherQueue) {
          result.push(otherQueue.shift()!);
          remainingCount--;
          progressed = true;
          continue;
        }
      }

      result.push(q.shift()!);
      remainingCount--;
      progressed = true;
    }

    if (!progressed) {
      // Fallback de segurança para esvaziar qualquer sobra restante
      for (const q of queues) {
        while (q.length > 0) {
          result.push(q.shift()!);
          remainingCount--;
        }
      }
      break;
    }
  }

  return result;
}

/**
 * Publica uma playlist semanal e arquiva a anterior.
 */
export async function publishWeeklyPlaylist(playlistId: string, publishedBy: string = 'ADMIN'): Promise<void> {
  const playlist = await prisma.weeklyPlaylist.findUnique({
    where: { id: playlistId },
    include: { items: { where: { isRemoved: false } } },
  });

  if (!playlist) {
    throw new Error('Playlist não encontrada.');
  }

  // 1. Arquiva qualquer playlist anteriormente PUBLISHED
  await prisma.weeklyPlaylist.updateMany({
    where: {
      status: 'PUBLISHED',
      id: { not: playlistId },
    },
    data: {
      status: 'ARCHIVED',
      archivedAt: new Date(),
    },
  });

  // 2. Publica a nova
  await prisma.weeklyPlaylist.update({
    where: { id: playlistId },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
  });

  // 3. Registra auditoria
  try {
    await prisma.auditLog.create({
      data: {
        entityName: 'WeeklyPlaylist',
        entityId: playlistId,
        action: 'publish',
        changesJson: JSON.stringify({
          weekIdentifier: playlist.weekIdentifier,
          itemsCount: playlist.items.length,
          publishedBy,
        }),
      },
    });
  } catch {}
}

/**
 * Verifica e executa publicação automática de rascunhos que ultrapassaram 48 horas.
 */
export async function checkAutoPublishDrafts(): Promise<number> {
  const now = new Date();
  const expiredDrafts = await prisma.weeklyPlaylist.findMany({
    where: {
      status: 'DRAFT',
      autoPublishAt: { lte: now },
    },
    include: {
      items: { where: { isRemoved: false } },
    },
  });

  let publishedCount = 0;
  for (const draft of expiredDrafts) {
    if (draft.items.length >= 1) {
      await publishWeeklyPlaylist(draft.id, 'AUTO_TIMEOUT_48H');
      publishedCount++;
    }
  }

  return publishedCount;
}

/**
 * Aplica a política de retenção de dados da API do YouTube:
 * - Apaga playlists ARCHIVED com mais de 30 dias (e seus itens em cascata).
 * - Limpa logs de sincronização com mais de 90 dias.
 */
export async function cleanupExpiredData(): Promise<{ playlistsDeleted: number; logsDeleted: number }> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const deletedPlaylists = await prisma.weeklyPlaylist.deleteMany({
    where: {
      status: 'ARCHIVED',
      generatedAt: { lt: thirtyDaysAgo },
    },
  });

  const deletedLogs = await prisma.playlistSyncLog.deleteMany({
    where: {
      executedAt: { lt: ninetyDaysAgo },
    },
  });

  return {
    playlistsDeleted: deletedPlaylists.count,
    logsDeleted: deletedLogs.count,
  };
}

interface SyncOptions {
  trigger?: 'CRON' | 'MANUAL';
  force?: boolean;
}

/**
 * Motor central de sincronização da Playlist da Onda.
 */
export async function syncWeeklyPlaylist(options: SyncOptions = {}): Promise<SyncResult> {
  const trigger = options.trigger || 'CRON';
  const weekId = getCurrentWeekIdentifier();

  // 1. Manutenção preventiva (TOS YouTube 30 dias + expiração de 48h)
  try {
    await cleanupExpiredData();
    await checkAutoPublishDrafts();
  } catch (err: any) {
    console.error('Erro na limpeza preventiva/auto-publicação:', err.message);
  }

  // 2. Verificação de idempotência
  const existingPlaylist = await prisma.weeklyPlaylist.findUnique({
    where: { weekIdentifier: weekId },
    include: { items: true },
  });

  if (existingPlaylist && existingPlaylist.status === 'PUBLISHED' && !options.force) {
    const msg = `Playlist da semana ${weekId} já está publicada e ativa. Nenhuma alteração feita (idempotência garantida).`;
    await prisma.playlistSyncLog.create({
      data: {
        status: 'SUCCESS',
        trigger,
        weekIdentifier: weekId,
        videosFound: 0,
        videosSelected: existingPlaylist.items.length,
        message: msg,
      },
    });
    return {
      ok: true,
      weekIdentifier: weekId,
      videosFound: 0,
      videosSelected: existingPlaylist.items.length,
      status: 'SKIPPED',
      message: msg,
    };
  }

  try {
    // 3. Canais oficiais ativos
    const channels = await prisma.officialChannel.findMany({
      where: { isActive: true },
    });

    if (channels.length === 0) {
      const msg = 'Nenhum canal oficial ativo cadastrado no painel.';
      await prisma.playlistSyncLog.create({
        data: {
          status: 'FAILED',
          trigger,
          weekIdentifier: weekId,
          videosFound: 0,
          videosSelected: 0,
          message: msg,
        },
      });
      return {
        ok: false,
        weekIdentifier: weekId,
        videosFound: 0,
        videosSelected: 0,
        status: 'SKIPPED',
        message: msg,
      };
    }

    // 4. IDs dos vídeos em Top Vídeos (para exclusão)
    const topVideos = await prisma.shortVideo.findMany({
      where: { isPublished: true, section: 'TOP_VIDEOS' },
      select: { url: true },
    });
    const excludedVideoIds = new Set<string>();
    for (const v of topVideos) {
      const id = extractYouTubeId(v.url);
      if (id) excludedVideoIds.add(id);
    }

    // 5. Varredura com paginação (até 6 páginas por canal) cobrindo a janela máxima de 90 dias
    let quotaCost = 0;
    let totalRead = 0;
    let totalOutOfWindowOnPages = 0;
    const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const allRawUploads: RawUploadVideo[] = [];

    for (const ch of channels) {
      try {
        const res = await fetchRecentUploadsWithPagination(
          ch.uploadsPlaylistId,
          since90,
          ch.channelTitle,
          ch.channelId,
          6
        );
        quotaCost += res.quotaCalls;
        totalRead += res.totalRead;
        totalOutOfWindowOnPages += res.outOfWindowCount;
        allRawUploads.push(...res.items);
      } catch (err: any) {
        console.error(`Erro ao buscar uploads paginados do canal ${ch.channelTitle}:`, err.message);
      }
    }

    // Candidatos únicos nos últimos 90 dias
    const candidateIdsSet = new Set<string>();
    for (const u of allRawUploads) {
      if (u.publishedAt >= since90) {
        candidateIdsSet.add(u.videoId);
      }
    }
    const candidateIds = Array.from(candidateIdsSet);

    // 6. Consulta de detalhes em lote com auditoria
    const detailsAudit = await batchFetchVideoDetailsWithAudit(candidateIds);
    quotaCost += detailsAudit.quotaCalls;
    const validMap = detailsAudit.validVideos;

    // Helper para carregar fallback da playlist publicada anterior
    const getPreviousPlaylistFallback = async (usedIds: Set<string>): Promise<VideoCandidate[]> => {
      const lastPublished = await prisma.weeklyPlaylist.findFirst({
        where: {
          status: 'PUBLISHED',
          weekIdentifier: { not: weekId },
        },
        orderBy: { publishedAt: 'desc' },
        include: {
          items: {
            where: { isRemoved: false },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

      const fallback: VideoCandidate[] = [];
      if (lastPublished && lastPublished.items.length > 0) {
        for (const prevItem of lastPublished.items) {
          if (!usedIds.has(prevItem.youtubeVideoId) && !excludedVideoIds.has(prevItem.youtubeVideoId)) {
            fallback.push({
              videoId: prevItem.youtubeVideoId,
              title: prevItem.title,
              channelTitle: prevItem.channelTitle,
              channelId: prevItem.channelId || '',
              thumbnailUrl: prevItem.thumbnailUrl,
              durationSeconds: prevItem.durationSeconds,
              publishedAt: prevItem.publishedAt,
            });
            usedIds.add(prevItem.youtubeVideoId);
          }
        }
      }
      return fallback;
    };

    // 7. Avalia as janelas progressivas: 14 -> 30 -> 60 -> 90
    // Janela 14: max 2 por canal. Janelas 30, 60, 90: max 4 por canal.
    const windowStages = [
      { days: 14, maxPerChannel: 2 },
      { days: 30, maxPerChannel: 4 },
      { days: 60, maxPerChannel: 4 },
      { days: 90, maxPerChannel: 4 },
    ];

    let chosenWindow = 14;
    let chosenSelectedVideos: VideoCandidate[] = [];
    let chosenSelectedFromUploads = 0;
    let chosenFallbackCount = 0;
    let chosenDiscards: DiscardCounts = {
      outOfWindow: 0,
      isShortOrVertical: 0,
      under60s: 0,
      over10m: 0,
      notMusicCategory: 0,
      liveOrPremiere: 0,
      notEmbeddable: 0,
      blockedTitle: 0,
      duplicate: 0,
      channelLimit: 0,
      inTopVideos: 0,
    };

    for (const stage of windowStages) {
      const cutoff = new Date(Date.now() - stage.days * 24 * 60 * 60 * 1000);
      const stageDiscards: DiscardCounts = {
        outOfWindow: totalOutOfWindowOnPages,
        isShortOrVertical: 0,
        under60s: 0,
        over10m: 0,
        notMusicCategory: 0,
        liveOrPremiere: 0,
        notEmbeddable: 0,
        blockedTitle: 0,
        duplicate: 0,
        channelLimit: 0,
        inTopVideos: 0,
      };

      const seenCandidateIds = new Set<string>();
      const validVideosByChannel = new Map<string, VideoCandidate[]>();

      for (const u of allRawUploads) {
        // 1. Repetido nos uploads
        if (seenCandidateIds.has(u.videoId)) {
          stageDiscards.duplicate++;
          continue;
        }
        seenCandidateIds.add(u.videoId);

        // 2. Fora da janela de publicação deste estágio
        if (u.publishedAt < cutoff) {
          stageDiscards.outOfWindow++;
          continue;
        }

        // 3. Já está em Top Vídeos
        if (excludedVideoIds.has(u.videoId)) {
          stageDiscards.inTopVideos++;
          continue;
        }

        // 4. Título não musical bloqueado no upload
        if (hasBlockedTitle(u.title)) {
          stageDiscards.blockedTitle++;
          continue;
        }

        // 5. Avaliação da API de detalhes
        const evalDetail = detailsAudit.auditMap.get(u.videoId);
        if (!evalDetail || evalDetail.status === 'DISCARDED') {
          const reason = evalDetail?.discardReason || 'notEmbeddable';
          stageDiscards[reason]++;
          continue;
        }

        // 6. Vídeo qualificado disputa vaga no canal
        const chList = validVideosByChannel.get(u.channelId) || [];
        chList.push(evalDetail.candidate!);
        validVideosByChannel.set(u.channelId, chList);
      }

      // 7. Seleção com limite por canal
      const stageUploadCandidates: VideoCandidate[] = [];
      const usedIdsForStage = new Set<string>();

      for (const [chId, list] of validVideosByChannel.entries()) {
        list.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
        const taken = list.slice(0, stage.maxPerChannel);
        const excess = list.slice(stage.maxPerChannel);
        stageDiscards.channelLimit += excess.length;

        for (const item of taken) {
          if (!usedIdsForStage.has(item.videoId)) {
            stageUploadCandidates.push(item);
            usedIdsForStage.add(item.videoId);
          } else {
            stageDiscards.duplicate++;
          }
        }
      }

      stageUploadCandidates.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

      // Se o total de uploads qualificados ultrapassar o teto máximo de 40, descarta o excedente por limite
      if (stageUploadCandidates.length > 40) {
        const excessGlobal = stageUploadCandidates.length - 40;
        stageDiscards.channelLimit += excessGlobal;
        stageUploadCandidates.splice(40);
      }

      // 8. Se faltar para 20 vídeos, completa com a playlist anterior
      const stageCandidates = [...stageUploadCandidates];
      let fallbackAdded = 0;
      if (stageCandidates.length < 20) {
        const fallbacks = await getPreviousPlaylistFallback(new Set(usedIdsForStage));
        for (const fb of fallbacks) {
          stageCandidates.push(fb);
          fallbackAdded++;
          if (stageCandidates.length >= 20) break;
        }
      }

      chosenWindow = stage.days;
      chosenSelectedVideos = stageCandidates;
      chosenSelectedFromUploads = stageUploadCandidates.length;
      chosenFallbackCount = fallbackAdded;
      chosenDiscards = stageDiscards;

      // Se atingiu o mínimo de 20 (incluindo eventual fallback), encerra a busca progressiva!
      if (chosenSelectedVideos.length >= 20) {
        break;
      }
    }

    const finalList = interleaveVideosByChannel(chosenSelectedVideos).slice(0, 40);
    const windowDays = chosenWindow;

    const stats: SyncAuditStats = {
      totalRead,
      selected: chosenSelectedFromUploads,
      fallbackAdded: chosenFallbackCount,
      windowDays,
      quotaCost,
      discards: chosenDiscards,
    };

    if (finalList.length === 0) {
      const noVideoMsg = `Nenhum vídeo qualificado foi encontrado nos canais cadastrados.\n${formatRaioX(stats)}`;
      await prisma.playlistSyncLog.create({
        data: {
          status: 'FAILED',
          trigger,
          weekIdentifier: weekId,
          videosFound: totalRead,
          videosSelected: 0,
          message: noVideoMsg,
        },
      });
      return {
        ok: false,
        weekIdentifier: weekId,
        videosFound: totalRead,
        videosSelected: 0,
        windowDays,
        quotaCost,
        stats,
        status: 'SKIPPED',
        message: 'Nenhum vídeo qualificado foi encontrado nos canais cadastrados.',
      };
    }

    // 8. Modo de aprovação (SystemConfig ou padrão MANUAL_REVIEW)
    const modeConfig = await prisma.systemConfig.findUnique({
      where: { key: 'weeklyPlaylistMode' },
    });
    const mode = (modeConfig?.value === 'AUTO') ? 'AUTO' : 'MANUAL_REVIEW';

    // 9. Salva ou atualiza a WeeklyPlaylist e seus itens
    let playlistRecord: any;
    if (existingPlaylist) {
      await prisma.weeklyPlaylistItem.deleteMany({
        where: { playlistId: existingPlaylist.id },
      });
      playlistRecord = await prisma.weeklyPlaylist.update({
        where: { id: existingPlaylist.id },
        data: {
          mode,
          status: mode === 'AUTO' ? 'PUBLISHED' : 'DRAFT',
          autoPublishAt: mode === 'MANUAL_REVIEW' ? new Date(Date.now() + 48 * 60 * 60 * 1000) : null,
          publishedAt: mode === 'AUTO' ? new Date() : null,
          windowDays,
          generatedAt: new Date(),
        },
      });
    } else {
      playlistRecord = await prisma.weeklyPlaylist.create({
        data: {
          weekIdentifier: weekId,
          title: 'Lançamentos da Semana',
          mode,
          status: mode === 'AUTO' ? 'PUBLISHED' : 'DRAFT',
          autoPublishAt: mode === 'MANUAL_REVIEW' ? new Date(Date.now() + 48 * 60 * 60 * 1000) : null,
          publishedAt: mode === 'AUTO' ? new Date() : null,
          windowDays,
          generatedAt: new Date(),
        },
      });
    }

    // Se for modo AUTO, arquiva a playlist anterior
    if (mode === 'AUTO') {
      await prisma.weeklyPlaylist.updateMany({
        where: {
          status: 'PUBLISHED',
          id: { not: playlistRecord.id },
        },
        data: {
          status: 'ARCHIVED',
          archivedAt: new Date(),
        },
      });
    }

    // Insere os itens
    for (let i = 0; i < finalList.length; i++) {
      const v = finalList[i];
      await prisma.weeklyPlaylistItem.create({
        data: {
          playlistId: playlistRecord.id,
          youtubeVideoId: v.videoId,
          title: v.title,
          channelTitle: v.channelTitle,
          channelId: v.channelId || null,
          thumbnailUrl: v.thumbnailUrl,
          durationSeconds: v.durationSeconds,
          publishedAt: v.publishedAt,
          sortOrder: i,
          isRemoved: false,
        },
      });
    }

    const summaryMsg = `${finalList.length} vídeos, janela de ${windowDays} dias (Cota: ${quotaCost} unidades)`;
    const fullSuccessMsg = `Playlist semanal gerada com sucesso: ${finalList.length} vídeos selecionados (janela de ${windowDays} dias).\n${formatRaioX(stats)}`;
    await prisma.playlistSyncLog.create({
      data: {
        status: 'SUCCESS',
        trigger,
        weekIdentifier: weekId,
        videosFound: totalRead,
        videosSelected: finalList.length,
        message: fullSuccessMsg,
      },
    });

    return {
      ok: true,
      weekIdentifier: weekId,
      videosFound: totalRead,
      videosSelected: finalList.length,
      windowDays,
      quotaCost,
      stats,
      status: mode === 'AUTO' ? 'PUBLISHED' : 'DRAFT',
      message: summaryMsg,
    };
  } catch (err: any) {
    const errorMsg = `Falha na sincronização da playlist semanal: ${err.message}`;
    console.error(errorMsg);
    await prisma.playlistSyncLog.create({
      data: {
        status: 'FAILED',
        trigger,
        weekIdentifier: weekId,
        videosFound: 0,
        videosSelected: 0,
        message: errorMsg,
      },
    });
    return {
      ok: false,
      weekIdentifier: weekId,
      videosFound: 0,
      videosSelected: 0,
      status: 'SKIPPED',
      message: errorMsg,
    };
  }
}
