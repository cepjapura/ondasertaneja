import { NextResponse } from 'next/server';
import { recordSponsorClick } from '@/lib/sponsor';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    let sponsorSlug = 'alessandro-mioto';

    // Tenta ler do body se fornecido, sem coletar nada pessoal
    try {
      const body = await req.json();
      if (body?.sponsor && typeof body.sponsor === 'string') {
        // Sanitiza o slug: apenas letras minúsculas, números e hífens
        sponsorSlug = body.sponsor.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 50);
      }
    } catch {
      // Ignora erro de parse caso o body venha vazio
    }

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
