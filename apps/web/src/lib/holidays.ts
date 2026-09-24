import type { Holiday } from '../types';
const cache = new Map<number, { expires: number; data: Holiday[] }>();
export async function holidays(year: number, signal?: AbortSignal): Promise<Holiday[]> {
  signal?.throwIfAborted();
  if (!Number.isInteger(year) || year < 1900 || year > 2100) throw new Error('Ano inválido.');
  const cached = cache.get(year);
  if (cached && cached.expires > Date.now()) return cached.data;
  const timeout = AbortSignal.timeout(5000);
  const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/BR`, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!response.ok) throw new Error('Não foi possível carregar os feriados.');
  const body: unknown = await response.json();
  if (!Array.isArray(body)) throw new Error('Resposta inválida do serviço de feriados.');
  const data: Holiday[] = body
    .filter(
      (item) =>
        item &&
        typeof item.date === 'string' &&
        new RegExp(`^${year}-\\d{2}-\\d{2}$`).test(item.date) &&
        typeof item.localName === 'string' &&
        typeof item.name === 'string' &&
        item.countryCode === 'BR' &&
        item.global === true &&
        Array.isArray(item.types) &&
        item.types.includes('Public'),
    )
    .map(({ date, localName, name }) => ({
      date,
      localName,
      name,
      countryCode: 'BR',
      global: true,
    }));
  signal?.throwIfAborted();
  cache.set(year, { data, expires: Date.now() + 86400000 });
  return data;
}
