/**
 * Utilitários para sanitização de variáveis de ambiente e entradas de texto.
 */

/**
 * Limpa espaços em branco e aspas (simples ou duplas) no início e no fim da string.
 * Protege contra valores colados em painéis de hospedagem (hPanel, Vercel, Docker, cPanel)
 * com aspas literais ou espaços residuais.
 */
export function cleanEnv(value?: string | null): string {
  if (!value) return '';
  let str = value.trim();
  while (
    (str.startsWith('"') && str.endsWith('"')) ||
    (str.startsWith("'") && str.endsWith("'"))
  ) {
    str = str.slice(1, -1).trim();
  }
  return str;
}

/**
 * Limpa aspas e espaços e normaliza o e-mail para letras minúsculas.
 */
export function cleanEmail(value?: string | null): string {
  return cleanEnv(value).toLowerCase();
}
