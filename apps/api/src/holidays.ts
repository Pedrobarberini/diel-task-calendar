import { z } from 'zod';

const holidaySchema = z.object({
  date: z.iso.date(),
  localName: z.string().min(1),
  name: z.string().min(1),
  countryCode: z.literal('BR'),
  global: z.boolean(),
  types: z.array(z.string()),
});
export type Holiday = Omit<z.infer<typeof holidaySchema>, 'types'>;
export type HolidayFetcher = (
  url: string,
  init: RequestInit,
) => Promise<Pick<Response, 'ok' | 'json'>>;

export async function loadHolidays(
  year: number,
  fetcher: HolidayFetcher = fetch,
): Promise<Holiday[]> {
  try {
    const response = await fetcher(`https://date.nager.at/api/v3/PublicHolidays/${year}/BR`, {
      signal: AbortSignal.timeout(5000),
      headers: { accept: 'application/json' },
    });
    if (!response.ok) throw new Error('Holiday provider returned an error');
    return z
      .array(holidaySchema)
      .parse(await response.json())
      .filter(
        (holiday) =>
          holiday.global && holiday.types.includes('Public') && holiday.date.startsWith(`${year}-`),
      )
      .map(({ types: _types, ...holiday }) => holiday)
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    throw new Error('HOLIDAYS_UNAVAILABLE');
  }
}
