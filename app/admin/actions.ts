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
import { cleanEmail } from '@/lib/env';
import { parseAndValidateVideoUrl } from '@/lib/videos';
import { logAuditEvent } from '@/lib/audit';
import { isRadioAvailable } from '@/lib/radio';
import { parseAndValidatePlaylistUrl, PlaylistInfo } from '@/lib/playlist';

/**
 * Server Action de Login com proteção contra Timing Attack e Rate Limit.
 */
export async function loginAction(prevState: any, formData: FormData) {
  const reqHeaders = headers();
  const ip = getClientIp(reqHeaders);
  const rawEmail = (formData.get('email') as string) || '';
  const email = cleanEmail(rawEmail);
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
  const rawSection = (formData.get('section') as string) || '';
  const customThumbnail = (formData.get('thumbnailUrl') as string) || '';

  if (!title.trim()) {
    return { error: 'O título do vídeo é obrigatório.' };
  }

  try {
    const parsed = await parseAndValidateVideoUrl(url, customThumbnail);
    const section = rawSection === 'TOP_VIDEOS' || rawSection === 'SHORTS' ? rawSection : parsed.suggestedSection;

    const maxOrder = await prisma.shortVideo.aggregate({
      where: { section },
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
        section,
      },
    });

    await logAuditEvent({
      entityName: 'ShortVideo',
      entityId: video.id,
      action: 'create',
      changesJson: { title: video.title, platform: video.platform, url: video.url, section: video.section },
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

  const currentVideo = await prisma.shortVideo.findUnique({
    where: { id: videoId },
  });
  if (!currentVideo) return;

  const videos = await prisma.shortVideo.findMany({
    where: { section: currentVideo.section },
    orderBy: { sortOrder: 'asc' },
  });

  const currentIndex = videos.findIndex((v) => v.id === videoId);
  if (currentIndex === -1) return;

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= videos.length) return;

  // currentVideo ja capturado
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
      section: currentVideo.section,
      previousOrder: currentVideo.sortOrder,
      newOrder: targetVideo.sortOrder,
    },
    userId: admin.id,
  });

  revalidatePath('/');
  revalidatePath('/admin/videos');
}

/**
 * Salva a configuração da Playlist da Onda no SystemConfig (Formulário independente).
 * Campo vazio significa desativar/limpar a playlist sem erro.
 */
export async function savePlaylistConfigAction(prevState: any, formData: FormData) {
  const admin = await verifyAdminSession();

  const playlistUrlRaw = (formData.get('playlistUrl') as string) || '';
  const trimmed = playlistUrlRaw.trim();

  // Campo vazio significa desativar/limpar a playlist sem erro
  if (!trimmed) {
    await prisma.systemConfig.upsert({
      where: { key: 'playlistUrl' },
      update: { value: '' },
      create: { key: 'playlistUrl', value: '' },
    });
    await prisma.systemConfig.upsert({
      where: { key: 'wavePlaylistUrl' },
      update: { value: '' },
      create: { key: 'wavePlaylistUrl', value: '' },
    });
    await prisma.systemConfig.upsert({
      where: { key: 'playlistEmbedUrl' },
      update: { value: '' },
      create: { key: 'playlistEmbedUrl', value: '' },
    });

    await logAuditEvent({
      entityName: 'SystemConfig',
      entityId: 'playlistUrl',
      action: 'clear',
      changesJson: { cleared: true, field: 'playlistUrl' },
      userId: admin.id,
    });

    revalidatePath('/');
    revalidatePath('/admin/configuracoes');

    return { success: true, message: 'Playlist da Onda desativada com sucesso.' };
  }

  // Validação estrita de formatos aceitos (Spotify / YouTube / YouTube Music)
  let parsed: PlaylistInfo;
  try {
    parsed = parseAndValidatePlaylistUrl(trimmed);
  } catch (err: any) {
    return { error: err.message || 'Link de playlist inválido.' };
  }

  await prisma.systemConfig.upsert({
    where: { key: 'playlistUrl' },
    update: { value: parsed.originalUrl },
    create: { key: 'playlistUrl', value: parsed.originalUrl },
  });
  await prisma.systemConfig.upsert({
    where: { key: 'wavePlaylistUrl' },
    update: { value: parsed.originalUrl },
    create: { key: 'wavePlaylistUrl', value: parsed.originalUrl },
  });
  await prisma.systemConfig.upsert({
    where: { key: 'playlistEmbedUrl' },
    update: { value: parsed.embedUrl },
    create: { key: 'playlistEmbedUrl', value: parsed.embedUrl },
  });

  await logAuditEvent({
    entityName: 'SystemConfig',
    entityId: 'playlistUrl',
    action: 'update',
    changesJson: { playlistUrl: parsed.originalUrl, playlistEmbedUrl: parsed.embedUrl },
    userId: admin.id,
  });

  revalidatePath('/');
  revalidatePath('/admin/configuracoes');

  return { success: true, message: 'Playlist da Onda salva com sucesso!' };
}

/**
 * Salva a configuração do Link da Rádio ao Vivo no SystemConfig (Formulário independente).
 * Campo vazio significa "sem rádio" e deve salvar sem erro.
 */
export async function saveRadioConfigAction(prevState: any, formData: FormData) {
  const admin = await verifyAdminSession();

  const streamAudioUrlRaw = (formData.get('streamAudioUrl') as string) || '';
  const trimmed = streamAudioUrlRaw.trim();

  // Campo vazio significa "sem rádio" e deve salvar sem erro
  if (!trimmed) {
    await prisma.systemConfig.upsert({
      where: { key: 'streamAudioUrl' },
      update: { value: '' },
      create: { key: 'streamAudioUrl', value: '' },
    });

    await logAuditEvent({
      entityName: 'SystemConfig',
      entityId: 'streamAudioUrl',
      action: 'clear',
      changesJson: { cleared: true, field: 'streamAudioUrl' },
      userId: admin.id,
    });

    revalidatePath('/');
    revalidatePath('/admin/configuracoes');

    return { success: true, message: 'Rádio desativada com sucesso (sem rádio).' };
  }

  // Se preenchido, valida se é HTTPS e se não é placeholder
  if (!trimmed.startsWith('https://')) {
    return { error: 'O link da rádio ao vivo deve começar estritamente com "https://".' };
  }

  if (!isRadioAvailable(trimmed)) {
    return {
      error:
        'O link da rádio ao vivo é inválido ou contém valores de exemplo/placeholder (ex.: localhost, SEU_STREAM).',
    };
  }

  await prisma.systemConfig.upsert({
    where: { key: 'streamAudioUrl' },
    update: { value: trimmed },
    create: { key: 'streamAudioUrl', value: trimmed },
  });

  await logAuditEvent({
    entityName: 'SystemConfig',
    entityId: 'streamAudioUrl',
    action: 'update',
    changesJson: { streamAudioUrl: trimmed },
    userId: admin.id,
  });

  revalidatePath('/');
  revalidatePath('/admin/configuracoes');

  return { success: true, message: 'Link da rádio ao vivo salvo com sucesso!' };
}

/**
 * Salva as configurações de Playlist da Onda e Link da Rádio ao Vivo no SystemConfig.
 * Mantida para retrocompatibilidade.
 */
export async function saveConfigAction(prevState: any, formData: FormData) {
  const admin = await verifyAdminSession();

  const playlistUrlRaw = (formData.get('playlistUrl') as string) || '';
  const streamAudioUrlRaw = (formData.get('streamAudioUrl') as string) || '';

  const trimmedPlaylist = playlistUrlRaw.trim();
  const trimmedStream = streamAudioUrlRaw.trim();

  // 1. Validação do Link da Rádio ao Vivo (se preenchido e não vazio)
  if (trimmedStream) {
    if (!trimmedStream.startsWith('https://')) {
      return { error: 'O link da rádio ao vivo deve começar estritamente com "https://".' };
    }
    if (!isRadioAvailable(trimmedStream)) {
      return {
        error:
          'O link da rádio ao vivo é inválido ou contém valores de exemplo/placeholder (ex.: localhost, SEU_STREAM).',
      };
    }
  }

  // 2. Validação da Playlist da Onda (se preenchida)
  let parsedPlaylist: PlaylistInfo | null = null;
  if (trimmedPlaylist) {
    try {
      parsedPlaylist = parseAndValidatePlaylistUrl(trimmedPlaylist);
    } catch (err: any) {
      return { error: err.message || 'Link de playlist inválido.' };
    }
  }

  // 3. Persistência no SystemConfig
  const changes: Record<string, any> = {};

  await prisma.systemConfig.upsert({
    where: { key: 'streamAudioUrl' },
    update: { value: trimmedStream },
    create: { key: 'streamAudioUrl', value: trimmedStream },
  });
  changes.streamAudioUrl = trimmedStream;

  if (trimmedPlaylist && parsedPlaylist) {
    await prisma.systemConfig.upsert({
      where: { key: 'playlistUrl' },
      update: { value: parsedPlaylist.originalUrl },
      create: { key: 'playlistUrl', value: parsedPlaylist.originalUrl },
    });
    await prisma.systemConfig.upsert({
      where: { key: 'wavePlaylistUrl' },
      update: { value: parsedPlaylist.originalUrl },
      create: { key: 'wavePlaylistUrl', value: parsedPlaylist.originalUrl },
    });
    await prisma.systemConfig.upsert({
      where: { key: 'playlistEmbedUrl' },
      update: { value: parsedPlaylist.embedUrl },
      create: { key: 'playlistEmbedUrl', value: parsedPlaylist.embedUrl },
    });
    changes.playlistUrl = parsedPlaylist.originalUrl;
    changes.playlistEmbedUrl = parsedPlaylist.embedUrl;
  }

  // 4. Auditoria
  await logAuditEvent({
    entityName: 'SystemConfig',
    entityId: 'global_settings',
    action: 'update',
    changesJson: changes,
    userId: admin.id,
  });

  revalidatePath('/');
  revalidatePath('/admin/configuracoes');

  return { success: true, message: 'Configurações salvas com sucesso!' };
}

/**
 * Limpa um campo específico do SystemConfig (Rádio ou Playlist).
 */
export async function clearConfigFieldAction(field: 'streamAudioUrl' | 'playlistUrl') {
  const admin = await verifyAdminSession();

  if (field === 'streamAudioUrl') {
    await prisma.systemConfig.upsert({
      where: { key: 'streamAudioUrl' },
      update: { value: '' },
      create: { key: 'streamAudioUrl', value: '' },
    });

    await logAuditEvent({
      entityName: 'SystemConfig',
      entityId: 'streamAudioUrl',
      action: 'clear',
      changesJson: { cleared: true, field: 'streamAudioUrl' },
      userId: admin.id,
    });
  } else if (field === 'playlistUrl') {
    await prisma.systemConfig.upsert({
      where: { key: 'playlistUrl' },
      update: { value: '' },
      create: { key: 'playlistUrl', value: '' },
    });
    await prisma.systemConfig.upsert({
      where: { key: 'wavePlaylistUrl' },
      update: { value: '' },
      create: { key: 'wavePlaylistUrl', value: '' },
    });
    await prisma.systemConfig.upsert({
      where: { key: 'playlistEmbedUrl' },
      update: { value: '' },
      create: { key: 'playlistEmbedUrl', value: '' },
    });

    await logAuditEvent({
      entityName: 'SystemConfig',
      entityId: 'playlistUrl',
      action: 'clear',
      changesJson: { cleared: true, field: 'playlistUrl' },
      userId: admin.id,
    });
  }

  revalidatePath('/');
  revalidatePath('/admin/configuracoes');

  return { success: true };
}
