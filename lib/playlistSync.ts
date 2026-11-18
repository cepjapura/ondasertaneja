import { prisma } from './prisma';
import {
  fetchRecentUploads,
  batchFetchVideoDetails,
  VideoCandidate,
} from './youtube';

export interface SyncResult {
  ok: boolean;
  weekIdentifier: string;
  videosFound: number;
  videosSelected: number;
  windowDays?: number;
  status: 'DRAFT' | 'PUBLISHED' | 'SKIPPED';
  message: string;
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

    // Helper para completar com vídeos da playlist publicada anterior
    const completeWithPreviousPlaylist = async (currentList: VideoCandidate[], usedIds: Set<string>) => {
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

      if (lastPublished && lastPublished.items.length > 0) {
        for (const prevItem of lastPublished.items) {
          if (!usedIds.has(prevItem.youtubeVideoId) && !excludedVideoIds.has(prevItem.youtubeVideoId)) {
            currentList.push({
              videoId: prevItem.youtubeVideoId,
              title: prevItem.title,
              channelTitle: prevItem.channelTitle,
              channelId: prevItem.channelId || '',
              thumbnailUrl: prevItem.thumbnailUrl,
              durationSeconds: prevItem.durationSeconds,
              publishedAt: prevItem.publishedAt,
            });
            usedIds.add(prevItem.youtubeVideoId);
            if (currentList.length >= 20) break;
          }
        }
      }
    };

    // 5. Janela inicial padrão: 14 dias (maxResults=25, limite de 2 por canal)
    let windowDays = 14;
    const since14 = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const candidateIdsByChannel14 = new Map<string, string[]>();
    const allCandidateIds14: string[] = [];

    for (const ch of channels) {
      try {
        const uploads = await fetchRecentUploads(ch.uploadsPlaylistId, since14, 25);
        const list: string[] = [];
        for (const u of uploads) {
          if (!excludedVideoIds.has(u.videoId)) {
            list.push(u.videoId);
            allCandidateIds14.push(u.videoId);
          }
        }
        candidateIdsByChannel14.set(ch.channelId, list);
      } catch (err: any) {
        console.error(`Erro ao buscar uploads 14d do canal ${ch.channelTitle}:`, err.message);
      }
    }

    let totalFound = allCandidateIds14.length;
    const validVideosMap14 = await batchFetchVideoDetails(allCandidateIds14);

    const selectedVideos14: VideoCandidate[] = [];
    const usedVideoIds14 = new Set<string>();

    for (const [chId, candidateIds] of candidateIdsByChannel14.entries()) {
      let count = 0;
      for (const vId of candidateIds) {
        const details = validVideosMap14.get(vId);
        if (details && !usedVideoIds14.has(vId) && count < 2) {
          selectedVideos14.push(details);
          usedVideoIds14.add(vId);
          count++;
        }
      }
    }

    selectedVideos14.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

    // Se faltar para 20, completa com itens da playlist anterior
    if (selectedVideos14.length < 20) {
      await completeWithPreviousPlaylist(selectedVideos14, usedVideoIds14);
    }

    let selectedVideos = selectedVideos14;

    // 6. JANELA PROGRESSIVA (30 -> 60 -> 90 dias, maxResults=50, até 4 por canal)
    // Se, depois de completar com a playlist anterior, ainda houver menos de 20 vídeos:
    if (selectedVideos.length < 20) {
      const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const uploads90ByChannel = new Map<string, Array<{ videoId: string; publishedAt: Date }>>();
      const allCandidateIds90: string[] = [];

      for (const ch of channels) {
        try {
          const uploads = await fetchRecentUploads(ch.uploadsPlaylistId, since90, 50);
          const channelUploads: Array<{ videoId: string; publishedAt: Date }> = [];
          for (const u of uploads) {
            if (!excludedVideoIds.has(u.videoId)) {
              channelUploads.push({ videoId: u.videoId, publishedAt: u.publishedAt });
              allCandidateIds90.push(u.videoId);
            }
          }
          uploads90ByChannel.set(ch.channelId, channelUploads);
        } catch (err: any) {
          console.error(`Erro ao buscar uploads ampliados do canal ${ch.channelTitle}:`, err.message);
        }
      }

      totalFound = allCandidateIds90.length;
      const validVideosMap90 = await batchFetchVideoDetails(allCandidateIds90);

      const expandedWindows = [30, 60, 90];
      for (const days of expandedWindows) {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const candidateList: VideoCandidate[] = [];
        const usedIdsForWindow = new Set<string>();

        for (const [chId, uploads] of uploads90ByChannel.entries()) {
          let count = 0;
          for (const u of uploads) {
            if (u.publishedAt >= cutoff && count < 4) {
              const details = validVideosMap90.get(u.videoId);
              if (details && !usedIdsForWindow.has(u.videoId)) {
                candidateList.push(details);
                usedIdsForWindow.add(u.videoId);
                count++;
              }
            }
          }
        }

        candidateList.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

        if (candidateList.length < 20) {
          await completeWithPreviousPlaylist(candidateList, usedIdsForWindow);
        }

        windowDays = days;
        selectedVideos = candidateList;

        // Para assim que chegar a 20 vídeos
        if (selectedVideos.length >= 20) {
          break;
        }
      }
    }

    // 7. Limite máximo de 40 vídeos
    const finalList = selectedVideos.slice(0, 40);

    if (finalList.length === 0) {
      const noVideoMsg = 'Nenhum vídeo qualificado foi encontrado nos canais cadastrados.';
      await prisma.playlistSyncLog.create({
        data: {
          status: 'FAILED',
          trigger,
          weekIdentifier: weekId,
          videosFound: totalFound,
          videosSelected: 0,
          message: noVideoMsg,
        },
      });
      return {
        ok: false,
        weekIdentifier: weekId,
        videosFound: totalFound,
        videosSelected: 0,
        windowDays,
        status: 'SKIPPED',
        message: noVideoMsg,
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

    const summaryMsg = `${finalList.length} vídeos, janela de ${windowDays} dias`;
    const fullSuccessMsg = `Playlist semanal gerada com sucesso: ${finalList.length} vídeos (janela de ${windowDays} dias). Modo: ${mode}.`;
    await prisma.playlistSyncLog.create({
      data: {
        status: 'SUCCESS',
        trigger,
        weekIdentifier: weekId,
        videosFound: totalFound,
        videosSelected: finalList.length,
        message: fullSuccessMsg,
      },
    });

    return {
      ok: true,
      weekIdentifier: weekId,
      videosFound: totalFound,
      videosSelected: finalList.length,
      windowDays,
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
