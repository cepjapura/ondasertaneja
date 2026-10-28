import React from 'react';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/auth';
import VideoForm from './VideoForm';
import VideoList from './VideoList';

export const dynamic = 'force-dynamic';

export default async function AdminVideosPage() {
  await verifyAdminSession();

  const videos = await prisma.shortVideo.findMany({
    orderBy: { sortOrder: 'asc' },
  });

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Gestão de Vídeos Curtos</h1>
          <p className="admin-page-description">
            Cadastre e ordene os vídeos exibidos na seção "Assista em 30 Segundos" da página inicial.
          </p>
        </div>
      </div>

      <VideoForm />

      <VideoList videos={videos} />
    </div>
  );
}
