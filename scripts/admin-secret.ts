import crypto from 'crypto';

function main() {
  console.log('\n=== GERADOR DE SEGREDO DE SESSÃO ADMIN (ONDA SERTANEJA) ===\n');

  // Gera 32 bytes de alta entropia (256 bits) convertidos para hexadecimal (64 caracteres)
  const secret = crypto.randomBytes(32).toString('hex');

  console.log('Cole a linha abaixo no arquivo .env (dev) e no hPanel (produção):');
  console.log('--------------------------------------------------------------------------------');
  console.log(`SESSION_SECRET="${secret}"`);
  console.log('--------------------------------------------------------------------------------\n');
}

main();
