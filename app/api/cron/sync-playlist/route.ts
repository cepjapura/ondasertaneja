import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { cleanEnv } from '@/lib/env';
import { syncWeeklyPlaylist } from '@/lib/playlistSync';

export const dynamic = 'force-dynamic';

function timingSafeCheck(headerToken: string | null, secret: string): boolean {
  if (!headerToken || !secret) return false;

  const cleanHeader = headerToken.replace(/^Bearer\s+/i, '').trim();
  const cleanSecret = secret.trim();

  if (!cleanHeader || !cleanSecret) return false;

  const a = Buffer.from(cleanHeader, 'utf-8');
  const b = Buffer.from(cleanSecret, 'utf-8');

  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = cleanEnv(process.env.CRON_SECRET);

    if (!cronSecret) {
      return NextResponse.json(
        { ok: false, error: 'CRON_SECRET não configurado no servidor.' },
        { status: 500 }
      );
    }

    if (!timingSafeCheck(authHeader, cronSecret)) {
      return NextResponse.json(
        { ok: false, error: 'Não autorizado.' },
        { status: 401 }
      );
    }

    const result = await syncWeeklyPlaylist({ trigger: 'CRON' });

    return NextResponse.json(result, {
      status: result.ok ? 200 : 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || 'Erro interno no servidor' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: 'Método não permitido. Utilize POST com Authorization: Bearer <CRON_SECRET>.' },
    { status: 405 }
  );
}
