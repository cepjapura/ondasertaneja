/**
 * Utilitários para verificar a disponibilidade da rádio ao vivo.
 */

/**
 * Função única que determina se a rádio está disponível para transmissão.
 *
 * Regras:
 * - Deve existir e ser uma string não-vazia.
 * - Deve começar estritamente com "https://".
 * - Não pode conter valores de exemplo / placeholder (ex.: "SEU_STREAM_AQUI", "localhost", "example.com").
 *
 * @param streamUrl URL de áudio cadastrada na configuração
 * @returns boolean indicando se a rádio está disponível
 */
export function isRadioAvailable(streamUrl?: string | null): boolean {
  if (!streamUrl || typeof streamUrl !== 'string') {
    return false;
  }

  const trimmed = streamUrl.trim();
  if (!trimmed.startsWith('https://')) {
    return false;
  }

  const upper = trimmed.toUpperCase();
  if (
    upper.includes('SEU_STREAM_AQUI') ||
    upper.includes('SEU_STREAM') ||
    upper.includes('EXEMPLO') ||
    upper.includes('EXAMPLE') ||
    upper.includes('LOCALHOST') ||
    upper.includes('URL_DO_STREAM') ||
    upper.includes('SEU_DOMINIO')
  ) {
    return false;
  }

  return true;
}
