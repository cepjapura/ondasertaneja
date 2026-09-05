import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const configs = await prisma.systemConfig.findMany();
    const configMap: Record<string, string> = {};
    configs.forEach(c => {
      configMap[c.key] = c.value;
    });

    return NextResponse.json(configMap);
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    return NextResponse.json({ error: 'Erro ao carregar configurações' }, { status: 500 });
  }
}
