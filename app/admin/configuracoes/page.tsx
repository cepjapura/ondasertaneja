import React from 'react';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/auth';
import { isRadioAvailable } from '@/lib/radio';
import { getSponsorClickStats } from '@/lib/sponsor';
import ConfigForm from './ConfigForm';

export const dynamic = 'force-dynamic';

export default async function AdminConfiguracoesPage() {
  await verifyAdminSession();

  const [configs, sponsorStats] = await Promise.all([
    prisma.systemConfig.findMany({
      where: {
        key: {
          in: ['streamAudioUrl', 'playlistUrl', 'wavePlaylistUrl', 'playlistEmbedUrl', 'sponsorUrl'],
        },
      },
    }),
    getSponsorClickStats('alessandro-mioto'),
  ]);

  const configMap = Object.fromEntries(configs.map((c) => [c.key, c.value]));

  const rawStream = configMap.streamAudioUrl || '';
  // Se o valor salvo for um placeholder (isRadioAvailable falso), o campo da rádio aparece VAZIO no painel
  const streamAudioUrl = isRadioAvailable(rawStream) ? rawStream : '';
  const playlistUrl = configMap.playlistUrl || configMap.wavePlaylistUrl || '';
  const playlistEmbedUrl = configMap.playlistEmbedUrl || '';
  const sponsorUrl = configMap.sponsorUrl || '';

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Configurações do Portal</h1>
          <p className="admin-page-description">
            Gerencie o link de transmissão da rádio ao vivo, a playlist substituta e o link do patrocinador oficial da home.
          </p>
        </div>
      </div>

      <ConfigForm
        initialStreamUrl={streamAudioUrl}
        initialPlaylistUrl={playlistUrl}
        initialPlaylistEmbedUrl={playlistEmbedUrl}
        initialSponsorUrl={sponsorUrl}
        sponsorStats={sponsorStats}
      />
    </div>
  );
}
