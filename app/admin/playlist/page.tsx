import React from 'react';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/auth';
import PlaylistAdminClient from './PlaylistAdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminPlaylistPage() {
  await verifyAdminSession();

  const [channels, publishedPlaylist, draftPlaylist, modeConfig, lastLog] = await Promise.all([
    prisma.officialChannel.findMany({
      orderBy: { channelTitle: 'asc' },
    }),
    prisma.weeklyPlaylist.findFirst({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      include: {
        items: {
          where: { isRemoved: false },
          orderBy: { sortOrder: 'asc' },
        },
      },
    }),
    prisma.weeklyPlaylist.findFirst({
      where: { status: 'DRAFT' },
      orderBy: { generatedAt: 'desc' },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    }),
    prisma.systemConfig.findUnique({
      where: { key: 'weeklyPlaylistMode' },
    }),
    prisma.playlistSyncLog.findFirst({
      orderBy: { executedAt: 'desc' },
    }),
  ]);

  const mode = (modeConfig?.value === 'AUTO') ? 'AUTO' : 'MANUAL_REVIEW';

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Playlist da Onda: Lançamentos da Semana</h1>
          <p className="admin-page-description">
            Gerencie os canais oficiais do YouTube monitorados, aprove o rascunho semanal ou dispare uma sincronização manual.
          </p>
        </div>
      </div>

      <PlaylistAdminClient
        channels={channels}
        publishedPlaylist={publishedPlaylist}
        draftPlaylist={draftPlaylist}
        mode={mode}
        lastLog={lastLog}
      />
    </div>
  );
}
