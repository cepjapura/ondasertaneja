import readline from 'readline';
import bcrypt from 'bcryptjs';

function promptPassword(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    let input = '';

    const isTTY = process.stdin.isTTY;
    if (isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();

    const onData = (char: Buffer) => {
      const str = char.toString('utf-8');
      for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (c === '\n' || c === '\r' || c === '\u0004') {
          process.stdin.removeListener('data', onData);
          if (isTTY) {
            process.stdin.setRawMode(false);
          }
          process.stdin.pause();
          process.stdout.write('\n');
          resolve(input);
          return;
        } else if (c === '\u0003') {
          // Ctrl+C
          process.stdout.write('\nOperação cancelada pelo usuário.\n');
          process.exit(1);
        } else if (c === '\u0008' || c === '\x7f') {
          // Backspace
          if (input.length > 0) {
            input = input.slice(0, -1);
          }
        } else {
          input += c;
        }
      }
    };

    process.stdin.on('data', onData);
  });
}

async function main() {
  console.log('\n=== GERADOR SEGURO DE HASH DE SENHA ADMIN (ONDA SERTANEJA) ===\n');

  const password = await promptPassword('Digite a senha do administrador (mínimo 12 caracteres): ');

  if (!password || password.length < 12) {
    console.error('\nErro: A senha precisa ter pelo menos 12 caracteres por segurança.\n');
    process.exit(1);
  }

  const confirmPassword = await promptPassword('Confirme a senha: ');

  if (password !== confirmPassword) {
    console.error('\nErro: As senhas digitadas não coincidem.\n');
    process.exit(1);
  }

  process.stdout.write('\nGerando hash bcrypt com salt cost 12...\n');
  const salt = bcrypt.genSaltSync(12);
  const rawHash = bcrypt.hashSync(password, salt);

  // Codificação Base64 para proteção contra expansão do caractere $ pelo dotenv-expand
  const b64Hash = Buffer.from(rawHash, 'utf8').toString('base64');

  // Teste de integridade obrigatório
  const decodedHash = Buffer.from(b64Hash, 'base64').toString('utf8');
  const isMatch = bcrypt.compareSync(password, decodedHash);

  if (!isMatch) {
    console.error('\nErro crítico: Falha no teste de integridade do hash decodificado.\n');
    process.exit(1);
  }

  console.log('\nHash gerado e validado com sucesso!\n');
  console.log('Cole a linha abaixo no arquivo .env (dev) ou nas variáveis do hPanel (produção):');
  console.log('--------------------------------------------------------------------------------');
  console.log(`ADMIN_PASSWORD_HASH_B64="${b64Hash}"`);
  console.log('--------------------------------------------------------------------------------\n');
}

main().catch((err) => {
  console.error('Erro inesperado:', err);
  process.exit(1);
});
