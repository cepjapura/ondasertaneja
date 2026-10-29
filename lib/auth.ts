import { getIronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

export interface AdminSessionData {
  userId: string;
  email: string;
  name: string;
  role: string;
  isLoggedIn: boolean;
}

export const defaultSession: AdminSessionData = {
  userId: '',
  email: '',
  name: '',
  role: '',
  isLoggedIn: false,
};

// Segredo da sessão: em produção, exige SESSION_SECRET definido com pelo menos 32 caracteres
const sessionSecret = process.env.SESSION_SECRET || 'fallback_development_session_secret_at_least_32_chars_long';

export const sessionOptions: SessionOptions = {
  password: sessionSecret,
  cookieName: process.env.NODE_ENV === 'production' ? '__Host-os_admin_session' : 'os_admin_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 8 * 60 * 60, // 8 horas de sessão
    path: '/',
  },
};

/**
 * Obtém a sessão criptografada a partir dos cookies da requisição.
 */
export async function getAdminSession() {
  const cookieStore = cookies();
  const session = await getIronSession<AdminSessionData>(cookieStore, sessionOptions);
  return session;
}

/**
 * Verificação ativa de sessão (Defesa em Profundidade).
 * Não confia apenas no middleware: valida se o usuário existe e continua ativo no banco de dados.
 */
export async function verifyAdminSession() {
  const session = await getAdminSession();

  if (!session.isLoggedIn || !session.userId) {
    throw new Error('Não autorizado: Sessão inválida ou expirada.');
  }

  const user = await prisma.adminUser.findUnique({
    where: { id: session.userId },
  });

  if (!user) {
    session.destroy();
    throw new Error('Não autorizado: Usuário não encontrado ou revogado.');
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

/**
 * Determina o endereço IP real do cliente.
 * Na Hostinger / Nginx Reverse Proxy, o cabeçalho X-Forwarded-For contém os IPs da cadeia (o primeiro é o cliente real).
 * O cabeçalho X-Real-IP é atribuído pelo proxy reverso primário da hospedagem.
 */
export function getClientIp(headers: Headers): string {
  const cfIp = headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  const xRealIp = headers.get('x-real-ip');
  if (xRealIp) return xRealIp.trim();

  const xForwarded = headers.get('x-forwarded-for');
  if (xForwarded) {
    const parts = xForwarded.split(',');
    if (parts.length > 0 && parts[0].trim()) {
      return parts[0].trim();
    }
  }

  return '127.0.0.1';
}

/**
 * Hash dummy pré-calculado com salt cost 12 para prevenção de Timing Attacks.
 * Garante que o bcrypt.compare sempre demore o mesmo tempo, mesmo quando o e-mail não existe no banco.
 */
const DUMMY_BCRYPT_HASH = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4L5WvqQhK.';

/**
 * Validação de tentativa de login contra o banco com prevenção de timing attacks.
 */
export async function authenticateAdmin(email: string, passwordPlain: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.adminUser.findUnique({
    where: { email: normalizedEmail },
  });

  // Se o usuário existir, compara com o hash real. Se não existir, compara com o hash dummy para tempo de resposta constante.
  const hashToCompare = user ? user.passwordHash : DUMMY_BCRYPT_HASH;
  const isMatch = await bcrypt.compare(passwordPlain, hashToCompare);

  if (!user || !isMatch) {
    return null;
  }

  return user;
}

/**
 * Verificação de Rate Limit: 5 tentativas incorretas a cada 15 minutos (por IP ou por e-mail).
 */
export async function checkRateLimit(ip: string, email: string): Promise<{ blocked: boolean; remainingAttempts: number }> {
  const normalizedEmail = email.trim().toLowerCase();
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

  const [ipFailures, emailFailures] = await Promise.all([
    prisma.loginAttempt.count({
      where: {
        ip,
        createdAt: { gte: fifteenMinutesAgo },
      },
    }),
    prisma.loginAttempt.count({
      where: {
        email: normalizedEmail,
        createdAt: { gte: fifteenMinutesAgo },
      },
    }),
  ]);

  const maxFailures = Math.max(ipFailures, emailFailures);
  if (maxFailures >= 5) {
    return { blocked: true, remainingAttempts: 0 };
  }

  return { blocked: false, remainingAttempts: 5 - maxFailures };
}

/**
 * Registra tentativa falha no banco de dados.
 */
export async function recordFailedLogin(ip: string, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  await prisma.loginAttempt.create({
    data: {
      ip,
      email: normalizedEmail,
    },
  });
}

/**
 * Limpa o histórico de tentativas após login bem-sucedido.
 */
export async function clearLoginAttempts(ip: string, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  await prisma.loginAttempt.deleteMany({
    where: {
      OR: [{ ip }, { email: normalizedEmail }],
    },
  });
}
