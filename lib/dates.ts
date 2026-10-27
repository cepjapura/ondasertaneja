/**
 * Utilitários de datas e fusos horários para a plataforma Onda Sertaneja.
 */

/**
 * Retorna o início do dia (00:00:00.000) no fuso horário America/Sao_Paulo (Horário de Brasília)
 * convertido para o objeto Date correspondente em UTC.
 *
 * Garante que eventos e shows cadastrados para o dia de hoje permaneçam visíveis
 * em "Próximos Shows" durante todas as 24 horas do dia no horário de Brasília,
 * independentemente de o servidor de produção rodar em UTC.
 *
 * @param date Data de referência (opcional, padrão: new Date())
 */
export function getStartOfDaySaoPaulo(date: Date = new Date()): Date {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = formatter.format(date); // YYYY-MM-DD em America/Sao_Paulo
  return new Date(`${dateStr}T00:00:00-03:00`);
}
