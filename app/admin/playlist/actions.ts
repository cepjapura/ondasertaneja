'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/auth';
import { resolveChannel } from '@/lib/youtube';
import { syncWeeklyPlaylist, publishWeeklyPlaylist, SyncResult } from '@/lib/playlistSync';

export async function addChannelAction(formData: FormData) {
  const admin = await verifyAdminSession();
  const input = formData.get('channelUrlOrHandle') as string;

  if (!input || !input.trim()) {
    return { ok: false, error: 'Link de canal do YouTube inválido.' };
  }

  try {
    const resolved = await resolveChannel(input.trim());

    // Verifica se já existe
    const existing = await prisma.officialChannel.findUnique({
      where: { channelId: resolved.channelId },
    });

    if (existing) {
      return { ok: false, error: `O canal "${existing.channelTitle}" já está cadastrado.` };
    }

    const created = await prisma.officialChannel.create({
      data: {
        channelId: resolved.channelId,
        channelTitle: resolved.channelTitle,
        channelUrl: resolved.channelUrl,
        avatarUrl: resolved.avatarUrl,
        uploadsPlaylistId: resolved.uploadsPlaylistId,
        subscriberCount: resolved.subscriberCount,
        isVerified: resolved.isVerified,
        isActive: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityName: 'OfficialChannel',
        entityId: created.id,
        action: 'create',
        changesJson: JSON.stringify({
          channelTitle: created.channelTitle,
          channelId: created.channelId,
          channelUrl: created.channelUrl,
          createdBy: admin.email,
        }),
        userId: admin.id,
      },
    });

    revalidatePath('/admin/playlist');
    return { ok: true, channel: created };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Falha ao cadastrar canal.' };
  }
}

export async function toggleChannelAction(channelId: string) {
  const admin = await verifyAdminSession();

  try {
    const channel = await prisma.officialChannel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return { ok: false, error: 'Canal não encontrado.' };
    }

    const updated = await prisma.officialChannel.update({
      where: { id: channelId },
      data: { isActive: !channel.isActive },
    });

    await prisma.auditLog.create({
      data: {
        entityName: 'OfficialChannel',
        entityId: channel.id,
        action: 'update',
        changesJson: JSON.stringify({
          channelTitle: channel.channelTitle,
          previousActive: channel.isActive,
          newActive: updated.isActive,
          updatedBy: admin.email,
        }),
        userId: admin.id,
      },
    });

    revalidatePath('/admin/playlist');
    return { ok: true, isActive: updated.isActive };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Falha ao alternar canal.' };
  }
}

export async function deleteChannelAction(channelId: string) {
  const admin = await verifyAdminSession();

  try {
    const channel = await prisma.officialChannel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return { ok: false, error: 'Canal não encontrado.' };
    }

    await prisma.officialChannel.delete({
      where: { id: channelId },
    });

    await prisma.auditLog.create({
      data: {
        entityName: 'OfficialChannel',
        entityId: channel.id,
        action: 'delete',
        changesJson: JSON.stringify({
          channelTitle: channel.channelTitle,
          channelId: channel.channelId,
          deletedBy: admin.email,
        }),
        userId: admin.id,
      },
    });

    revalidatePath('/admin/playlist');
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Falha ao excluir canal.' };
  }
}

export async function updatePlaylistModeAction(mode: 'MANUAL_REVIEW' | 'AUTO') {
  const admin = await verifyAdminSession();

  try {
    await prisma.systemConfig.upsert({
      where: { key: 'weeklyPlaylistMode' },
      create: { key: 'weeklyPlaylistMode', value: mode },
      update: { value: mode },
    });

    await prisma.auditLog.create({
      data: {
        entityName: 'SystemConfig',
        entityId: 'weeklyPlaylistMode',
        action: 'update',
        changesJson: JSON.stringify({ mode, updatedBy: admin.email }),
        userId: admin.id,
      },
    });

    revalidatePath('/admin/playlist');
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Falha ao atualizar modo de aprovação.' };
  }
}

export async function removeItemFromDraftAction(itemId: string) {
  const admin = await verifyAdminSession();

  try {
    const item = await prisma.weeklyPlaylistItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return { ok: false, error: 'Item não encontrado.' };
    }

    await prisma.weeklyPlaylistItem.update({
      where: { id: itemId },
      data: { isRemoved: true },
    });

    await prisma.auditLog.create({
      data: {
        entityName: 'WeeklyPlaylistItem',
        entityId: itemId,
        action: 'remove_from_draft',
        changesJson: JSON.stringify({
          title: item.title,
          youtubeVideoId: item.youtubeVideoId,
          removedBy: admin.email,
        }),
        userId: admin.id,
      },
    });

    revalidatePath('/admin/playlist');
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Falha ao remover vídeo.' };
  }
}

export async function restoreItemToDraftAction(itemId: string) {
  const admin = await verifyAdminSession();

  try {
    await prisma.weeklyPlaylistItem.update({
      where: { id: itemId },
      data: { isRemoved: false },
    });

    revalidatePath('/admin/playlist');
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Falha ao restaurar vídeo.' };
  }
}

export async function approveDraftAction(playlistId: string) {
  const admin = await verifyAdminSession();

  try {
    await publishWeeklyPlaylist(playlistId, admin.email);

    revalidatePath('/');
    revalidatePath('/admin/playlist');
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Falha ao aprovar playlist.' };
  }
}

export async function manualSyncAction(): Promise<SyncResult> {
  const admin = await verifyAdminSession();

  try {
    const result = await syncWeeklyPlaylist({ trigger: 'MANUAL', force: true });

    await prisma.auditLog.create({
      data: {
        entityName: 'WeeklyPlaylist',
        entityId: result.weekIdentifier || 'manual',
        action: 'manual_sync',
        changesJson: JSON.stringify({
          result,
          triggeredBy: admin.email,
        }),
        userId: admin.id,
      },
    });

    revalidatePath('/');
    revalidatePath('/admin/playlist');
    return result;
  } catch (err: any) {
    return {
      ok: false,
      weekIdentifier: '',
      videosFound: 0,
      videosSelected: 0,
      status: 'SKIPPED' as const,
      message: err.message || 'Falha na sincronização manual.',
    };
  }
}
