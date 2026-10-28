import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Parâmetro id é obrigatório.' }, { status: 400 });
  }

  // 1. Busca no banco de dados local (prevenção total contra SSRF aberto)
  const video = await prisma.shortVideo.findUnique({
    where: { id },
  });

  if (!video || video.platform !== 'tiktok') {
    return NextResponse.json({ error: 'Vídeo TikTok não encontrado ou inválido.' }, { status: 404 });
  }

  try {
    // 2. Consulta exclusivamente a oEmbed oficial da TikTok com timeout de 5 segundos
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(video.url)}`;
    const oembedRes = await fetch(oembedUrl, {
      headers: { 'User-Agent': 'OndaSertanejaBot/1.0' },
      signal: AbortSignal.timeout(5000),
    });

    if (!oembedRes.ok) {
      return NextResponse.json({ error: 'Falha ao consultar oEmbed da TikTok.' }, { status: 502 });
    }

    const oembedData = await oembedRes.json();
    const thumbnailUrl = oembedData.thumbnail_url;

    if (!thumbnailUrl || typeof thumbnailUrl !== 'string') {
      return NextResponse.json({ error: 'Thumbnail não fornecida pelo TikTok.' }, { status: 404 });
    }

    // 3. Validação estrita do domínio da imagem (anti-SSRF)
    const parsedThumb = new URL(thumbnailUrl);
    const allowedHosts = ['.tiktokcdn.com', '.byteoversea.com', '.ibytedtos.com', '.tiktok.com'];
    const isAllowedHost = allowedHosts.some(host => parsedThumb.hostname.endsWith(host));

    if (!isAllowedHost || parsedThumb.protocol !== 'https:') {
      return NextResponse.json({ error: 'Host de thumbnail não confiável.' }, { status: 400 });
    }

    // 4. Download da imagem com redirect: 'error' e validação do Content-Type
    const imageRes = await fetch(thumbnailUrl, {
      signal: AbortSignal.timeout(5000),
      redirect: 'error',
    });

    const contentType = imageRes.headers.get('content-type') || '';
    if (!imageRes.ok || !contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Conteúdo retornado não é uma imagem válida.' }, { status: 400 });
    }

    const imageBuffer = await imageRes.arrayBuffer();

    // 5. Retorno com Cache-Control de 4 horas
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=14400, s-maxage=14400, stale-while-revalidate=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err: any) {
    console.error('[ProxyThumbnail] Erro ao buscar capa do TikTok:', err?.message || err);
    return NextResponse.json({ error: 'Falha temporária ao carregar capa do vídeo.' }, { status: 500 });
  }
}
