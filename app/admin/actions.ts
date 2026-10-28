'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import {
  authenticateAdmin,
  getAdminSession,
  verifyAdminSession,
  checkRateLimit,
  recordFailedLogin,
  clearLoginAttempts,
  getClientIp,
} from '@/lib/auth';
import { parseAndValidateVideoUrl } from '@/lib/videos';
import { logAuditEvent } from '@/lib/audit';

/**
 * Server Action de Login com proteção contra Timing Attack e Rate Limit.
 */
export async function loginAction(prevState: any, formData: FormData) {
  const reqHeaders = headers();
  const ip = getClientIp(reqHeaders);
  const email = (formData.get('email') as string) || '';
  const password = (formData.get('password') as string) || '';

  if (!email || !password) {
    return { error: 'E-mail ou senha incorretos' };
  }

  // 1. Verificação de Rate Limit (5 tentativas a cada 15 minutos por IP ou E-mail)
  const { blocked } = await checkRateLimit(ip, email);
  if (blocked) {
    return { error: 'Muitas tentativas incorretas. Tente novamente em 15 minutos.' };
  }

  // 2. Autenticação com timing constante (compara hash dummy se usuário não existir)
  const user = await authenticateAdmin(email, password);

  if (!user) {
    await recordFailedLogin(ip, email);
    return { error: 'E-mail ou senha incorretos' };
  }

  // 3. Sucesso: limpa tentativas e inicializa sessão criptografada
  await clearLoginAttempts(ip, email);

  const session = await getAdminSession();
  session.userId = user.id;
  session.email = user.email;
  session.name = user.name;
  session.role = user.role;
  session.isLoggedIn = true;
  await session.save();

  await logAuditEvent({
    entityName: 'AdminUser',
    entityId: user.id,
    action: 'login',
    changesJson: { ip, userAgent: reqHeaders.get('user-agent') || '' },
    userId: user.id,
  });

  const nextUrl = (formData.get('next') as string) || '/admin/videos';
  redirect(nextUrl.startsWith('/admin') ? nextUrl : '/admin/videos');
}

/**
 * Server Action de Logout.
 */
export async function logoutAction() {
  const session = await getAdminSession();
  const userId = session.userId;

  if (userId) {
    await logAuditEvent({
      entityName: 'AdminUser',
      entityId: userId,
      action: 'logout',
      changesJson: {},
      userId,
    });
  }

  session.destroy();
  redirect('/admin/login');
}

/**
 * Criação de Vídeo Curto (ShortVideo).
 */
export async function createVideoAction(prevState: any, formData: FormData) {
  const admin = await verifyAdminSession();

  const title = (formData.get('title') as string) || '';
  const url = (formData.get('url') as string) || '';
  const customThumbnail = (formData.get('thumbnailUrl') as string) || '';

  if (!title.trim()) {
    return { error: 'O título do vídeo é obrigatório.' };
  }

  try {
    const parsed = await parseAndValidateVideoUrl(url, customThumbnail);

    const maxOrder = await prisma.shortVideo.aggregate({
      _max: { sortOrder: true },
    });
    const nextOrder = (maxOrder._max.sortOrder ?? 0) + 1;

    const video = await prisma.shortVideo.create({
      data: {
        title: title.trim(),
        url: parsed.normalizedUrl,
        platform: parsed.platform,
        thumbnailUrl: parsed.thumbnailUrl || null,
        isPublished: false, // Inicia como não publicado
        sortOrder: nextOrder,
      },
    });

    await logAuditEvent({
      entityName: 'ShortVideo',
      entityId: video.id,
      action: 'create',
      changesJson: { title: video.title, platform: video.platform, url: video.url },
      userId: admin.id,
    });

    revalidatePath('/');
    revalidatePath('/admin/videos');

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Erro ao processar e salvar o vídeo.' };
  }
}

/**
 * Alterna status de publicação (Publicar / Despublicar).
 */
export async function togglePublishVideoAction(videoId: string) {
  const admin = await verifyAdminSession();

  const video = await prisma.shortVideo.findUnique({
    where: { id: videoId },
  });

  if (!video) {
    throw new Error('Vídeo não encontrado.');
  }

  const newStatus = !video.isPublished;

  await prisma.shortVideo.update({
    where: { id: videoId },
    data: { isPublished: newStatus },
  });

  await logAuditEvent({
    entityName: 'ShortVideo',
    entityId: videoId,
    action: newStatus ? 'publish' : 'unpublish',
    changesJson: { previous: video.isPublished, next: newStatus },
    userId: admin.id,
  });

  revalidatePath('/');
  revalidatePath('/admin/videos');
}

/**
 * Exclui um vídeo.
 */
export async function deleteVideoAction(videoId: string) {
  const admin = await verifyAdminSession();

  const video = await prisma.shortVideo.findUnique({
    where: { id: videoId },
  });

  if (!video) {
    throw new Error('Vídeo não encontrado.');
  }

  await prisma.shortVideo.delete({
    where: { id: videoId },
  });

  await logAuditEvent({
    entityName: 'ShortVideo',
    entityId: videoId,
    action: 'delete',
    changesJson: { title: video.title, url: video.url, platform: video.platform },
    userId: admin.id,
  });

  revalidatePath('/');
  revalidatePath('/admin/videos');
}

/**
 * Move a ordem do vídeo para cima ou para baixo.
 */
export async function reorderVideoAction(videoId: string, direction: 'up' | 'down') {
  const admin = await verifyAdminSession();

  const videos = await prisma.shortVideo.findMany({
    orderBy: { sortOrder: 'asc' },
  });

  const currentIndex = videos.findIndex((v) => v.id === videoId);
  if (currentIndex === -1) return;

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= videos.length) return;

  const currentVideo = videos[currentIndex];
  const targetVideo = videos[targetIndex];

  // Troca sortOrder entre os dois
  await prisma.$transaction([
    prisma.shortVideo.update({
      where: { id: currentVideo.id },
      data: { sortOrder: targetVideo.sortOrder },
    }),
    prisma.shortVideo.update({
      where: { id: targetVideo.id },
      data: { sortOrder: currentVideo.sortOrder },
    }),
  ]);

  await logAuditEvent({
    entityName: 'ShortVideo',
    entityId: videoId,
    action: 'reorder',
    changesJson: {
      direction,
      previousOrder: currentVideo.sortOrder,
      newOrder: targetVideo.sortOrder,
    },
    userId: admin.id,
  });

  revalidatePath('/');
  revalidatePath('/admin/videos');
}
