import { NextResponse } from 'next/server';
import { recordSponsorClick } from '@/lib/sponsor';

export const dynamic = 'force-dynamic';

// Limite em memória por IP (10 cliques por hora, sem persistir IP em lugar nenhum)
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const ipRateLimits = new Map<string, RateLimitEntry>();
const MAX_CLICKS_PER_HOUR = 10;
const ONE_HOUR_MS = 60 * 60 * 1000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();

  // Limpeza preventiva de entradas expiradas se o Map crescer
  if (ipRateLimits.size > 500) {
    for (const [key, val] of ipRateLimits.entries()) {
      if (now >= val.resetAt) {
        ipRateLimits.delete(key);
      }
    }
  }

  const entry = ipRateLimits.get(ip);
  if (entry && now < entry.resetAt) {
    if (entry.count >= MAX_CLICKS_PER_HOUR) {
      return true;
    }
    entry.count += 1;
    return false;
  }

  ipRateLimits.set(ip, { count: 1, resetAt: now + ONE_HOUR_MS });
  return false;
}

// Detecção de robôs / crawlers comuns
const BOT_USER_AGENTS =
  /bot|crawler|spider|crawling|slurp|facebookexternalhit|whatsapp|googlebot|bingbot|yandex|duckduckbot|baiduspider|semrush|ahrefs|mj12bot|headless|phantom|puppeteer|wget|curl|python-requests/i;

function isOriginAllowed(originOrReferer: string | null, host: string | null): boolean {
  if (!originOrReferer) return false;

  try {
    const url = new URL(originOrReferer);
    const domain = url.hostname.toLowerCase();

    // Permite mesmo host do request
    if (host) {
      const hostDomain = host.split(':')[0].toLowerCase();
      if (domain === hostDomain) return true;
    }

    // Domínios autorizados do site e ambientes locais
    if (
      domain === 'ondasertaneja.com.br' ||
      domain.endsWith('.ondasertaneja.com.br') ||
      domain === 'localhost' ||
      domain === '127.0.0.1'
    ) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

export async function POST(req: Request) {
  try {
    const headers = req.headers;
    const host = headers.get('host');
    const origin = headers.get('origin');
    const referer = headers.get('referer');
    const userAgent = headers.get('user-agent') || '';

    // 1. Validação de Origin / Referer (aceita POST só do próprio site)
    const validOrigin = isOriginAllowed(origin, host) || isOriginAllowed(referer, host);
    if (!validOrigin) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    // 2. Ignora robôs e crawlers conhecidos sem contabilizar
    if (BOT_USER_AGENTS.test(userAgent)) {
      return NextResponse.json(
        { ok: true, ignored: true },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    // 3. Rate limit em memória por IP (10/hora, IP não é gravado em banco)
    const forwardedFor = headers.get('x-forwarded-for')?.split(',')[0].trim();
    const realIp = headers.get('x-real-ip')?.trim();
    const clientIp = forwardedFor || realIp || 'client';

    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        { ok: true, rateLimited: true },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    // 4. Sanitização do slug do patrocinador
    let sponsorSlug = 'alessandro-mioto';
    try {
      const body = await req.json();
      if (body?.sponsor && typeof body.sponsor === 'string') {
        sponsorSlug = body.sponsor.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 50);
      }
    } catch {
      // Ignora erro de parse caso o body venha vazio
    }

    // 5. Registra clique de forma anônima (apenas data/hora e sponsor)
    await recordSponsorClick(sponsorSlug);

    return NextResponse.json(
      { ok: true },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: 'Internal error' },
      { status: 500 }
    );
  }
}
