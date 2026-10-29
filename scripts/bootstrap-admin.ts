import { prisma } from '../lib/prisma';
import { cleanEnv, cleanEmail } from '../lib/env';

async function bootstrapAdmin() {
  const email = cleanEmail(process.env.ADMIN_EMAIL);
  const hashB64 = cleanEnv(process.env.ADMIN_PASSWORD_HASH_B64);
  const name = cleanEnv(process.env.ADMIN_NAME) || 'Administrador';
  const shouldReset = cleanEnv(process.env.ADMIN_RESET_PASSWORD) === 'true';

  if (!email || !hashB64) {
    console.log('[Bootstrap Admin] Pulado: ADMIN_EMAIL ou ADMIN_PASSWORD_HASH_B64 não informados nas variáveis de ambiente.');
    return;
  }

  // 1. Decodifica o hash de Base64 para UTF-8 (protegendo contra a expansão de '$' do dotenv-expand)
  let passwordHash = '';
  try {
    passwordHash = Buffer.from(hashB64, 'base64').toString('utf8');
  } catch (err) {
    throw new Error('[Bootstrap Admin] Falha: ADMIN_PASSWORD_HASH_B64 inválido (falha ao decodificar Base64).');
  }

  // 2. Validação estrita do hash bcrypt: deve começar com $2a$ ou $2b$ e ter exatamente 60 caracteres
  const isValidBcrypt =
    (passwordHash.startsWith('$2a$') || passwordHash.startsWith('$2b$')) &&
    passwordHash.length === 60;

  if (!isValidBcrypt) {
    throw new Error(
      '[Bootstrap Admin] Falha: O hash decodificado não é um hash bcrypt válido (deve iniciar com $2a$ ou $2b$ e conter exatamente 60 caracteres). Verifique o valor de ADMIN_PASSWORD_HASH_B64.'
    );
  }

  // 3. MODO RECUPERAÇÃO DE SENHA / CREDENCIAIS (ADMIN_RESET_PASSWORD=true)
  if (shouldReset) {
    const admins = await prisma.adminUser.findMany();

    if (admins.length === 1) {
      const targetAdmin = admins[0];
      const previousEmail = targetAdmin.email;

      await prisma.adminUser.update({
        where: { id: targetAdmin.id },
        data: {
          email,
          passwordHash,
        },
      });

      await prisma.auditLog.create({
        data: {
          entityName: 'AdminUser',
          entityId: targetAdmin.id,
          action: 'reset_password',
          changesJson: JSON.stringify({
            message: 'E-mail e senha redefinidos via flag ADMIN_RESET_PASSWORD no build/deploy',
            previousEmail,
            updatedEmail: email,
          }),
          userId: targetAdmin.id,
        },
      });

      console.log(`[Bootstrap Admin] Redefinido: administrador único atualizado com sucesso (e-mail e senha redefinidos para ${email}).`);
      console.log('⚠️  IMPORTANTE: Remova a variável ADMIN_RESET_PASSWORD do hPanel para evitar redefinições em deploys futuros.');
      return;
    } else if (admins.length === 0) {
      const created = await prisma.adminUser.create({
        data: {
          name,
          email,
          passwordHash,
          role: 'superadmin',
        },
      });

      await prisma.auditLog.create({
        data: {
          entityName: 'AdminUser',
          entityId: created.id,
          action: 'bootstrap_superadmin',
          changesJson: JSON.stringify({ email: created.email, role: created.role }),
          userId: created.id,
        },
      });

      console.log(`[Bootstrap Admin] Criado: nenhum administrador encontrado; primeiro superadministrador (${email}) criado com sucesso no modo de recuperação.`);
      console.log('⚠️  IMPORTANTE: Remova a variável ADMIN_RESET_PASSWORD do hPanel para evitar redefinições em deploys futuros.');
      return;
    } else {
      console.log(
        `[Bootstrap Admin] Pulado: existem ${admins.length} administradores no banco de dados. Por segurança, a redefinição automática via ADMIN_RESET_PASSWORD só é permitida quando existe exatamente 1 administrador.`
      );
      return;
    }
  }

  // 4. MODO BOOTSTRAP PADRÃO: Executa apenas se não existir nenhum administrador cadastrado
  const count = await prisma.adminUser.count();
  if (count > 0) {
    console.log(`[Bootstrap Admin] Pulado: já existe(m) ${count} administrador(es) cadastrado(s) no banco de dados e ADMIN_RESET_PASSWORD não está ativo.`);
    return;
  }

  const created = await prisma.adminUser.create({
    data: {
      name,
      email,
      passwordHash,
      role: 'superadmin',
    },
  });

  await prisma.auditLog.create({
    data: {
      entityName: 'AdminUser',
      entityId: created.id,
      action: 'bootstrap_superadmin',
      changesJson: JSON.stringify({ email: created.email, role: created.role }),
      userId: created.id,
    },
  });

  console.log(`[Bootstrap Admin] Criado: primeiro superadministrador (${email}) cadastrado com sucesso.`);
}

bootstrapAdmin()
  .catch((err) => {
    console.error('[Bootstrap Admin] Erro fatal durante bootstrap:', err.message || err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
