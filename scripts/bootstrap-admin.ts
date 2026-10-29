import { prisma } from '../lib/prisma';

async function bootstrapAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const hashB64 = process.env.ADMIN_PASSWORD_HASH_B64?.trim();
  const name = process.env.ADMIN_NAME?.trim() || 'Administrador';
  const shouldReset = process.env.ADMIN_RESET_PASSWORD === 'true';

  if (!email || !hashB64) {
    console.log('[Bootstrap Admin] ADMIN_EMAIL ou ADMIN_PASSWORD_HASH_B64 não informados. Pulando bootstrap.');
    return;
  }

  // Decodifica o hash de Base64 para UTF-8 (protegendo contra a expansão de '$' do dotenv-expand)
  let passwordHash = '';
  try {
    passwordHash = Buffer.from(hashB64, 'base64').toString('utf8');
  } catch (err) {
    console.error('[Bootstrap Admin] Erro: ADMIN_PASSWORD_HASH_B64 inválido (falha ao decodificar base64).');
    return;
  }

  if (!passwordHash.startsWith('$2')) {
    console.error('[Bootstrap Admin] Erro: O hash decodificado não é um hash bcrypt válido ($2a$... ou $2b$...).');
    return;
  }

  // MODO RECUPERAÇÃO DE SENHA (ADMIN_RESET_PASSWORD=true)
  if (shouldReset) {
    console.log(`[Bootstrap Admin] ADMIN_RESET_PASSWORD=true detectado. Atualizando senha de ${email}...`);
    const existing = await prisma.adminUser.findUnique({ where: { email } });

    if (existing) {
      await prisma.adminUser.update({
        where: { id: existing.id },
        data: { passwordHash },
      });

      await prisma.auditLog.create({
        data: {
          entityName: 'AdminUser',
          entityId: existing.id,
          action: 'reset_password',
          changesJson: JSON.stringify({ message: 'Senha redefinida via flag ADMIN_RESET_PASSWORD no deploy' }),
          userId: existing.id,
        },
      });

      console.log(`[Bootstrap Admin] Senha do admin ${email} atualizada com sucesso!`);
      console.log('⚠️  IMPORTANTE: Remova a variável ADMIN_RESET_PASSWORD do hPanel para evitar redefinições indesejadas.');
      return;
    } else {
      console.log(`[Bootstrap Admin] Admin ${email} não existia; criando novo superadmin no modo reset...`);
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
          action: 'bootstrap_superadmin_reset_mode',
          changesJson: JSON.stringify({ email: created.email, role: created.role }),
          userId: created.id,
        },
      });

      console.log(`[Bootstrap Admin] Superadministrador ${email} criado com sucesso!`);
      console.log('⚠️  IMPORTANTE: Remova a variável ADMIN_RESET_PASSWORD do hPanel.');
      return;
    }
  }

  // MODO BOOTSTRAP PADRÃO: Executa apenas se não existir nenhum administrador cadastrado
  const count = await prisma.adminUser.count();
  if (count > 0) {
    console.log(`[Bootstrap Admin] Já existem ${count} usuário(s) administrador(es) cadastrado(s). Pulando bootstrap.`);
    return;
  }

  console.log(`[Bootstrap Admin] Nenhum administrador encontrado. Criando primeiro superadministrador (${email})...`);
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

  console.log(`[Bootstrap Admin] Primeiro superadministrador (${email}) criado com sucesso!`);
}

bootstrapAdmin()
  .catch((err) => {
    console.error('[Bootstrap Admin] Erro fatal durante bootstrap:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
