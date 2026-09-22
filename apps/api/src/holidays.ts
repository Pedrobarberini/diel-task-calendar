import { z } from 'zod';
import { ApiError } from './errors.js';

const providerHolidaySchema = z.object({
  date: z.iso.date(),
  localName: z.string().min(1),
  name: z.string().min(1),
  countryCode: z.literal('BR'),
  global: z.boolean(),
  types: z.array(z.string()),
});

export interface Holiday {
  date: string;
  localName: string;
  name: string;
  countryCode: 'BR';
  global: boolean;
}

export type HolidayFetcher = (url: string, init: RequestInit) => Promise<Pick<Response, 'ok' | 'json'>>;

export class HolidayService {
  private readonly cache = new Map<number, { expiresAt: number; holidays: Holiday[] }>();
  private readonly pending = new Map<number, Promise<Holiday[]>>();

  constructor(
    private readonly fetcher: HolidayFetcher = fetch,
    private readonly now: () => number = Date.now,
    private readonly cacheTtlMs = 24 * 60 * 60 * 1000,
  ) {}

  async list(year: number): Promise<Holiday[]> {
    const cached = this.cache.get(year);
    if (cached && cached.expiresAt > this.now()) return cached.holidays;
    const existing = this.pending.get(year);
    if (existing) return existing;
    const request = this.load(year);
    this.pending.set(year, request);
    try {
      return await request;
    } finally {
      this.pending.delete(year);
    }
  }

  private async load(year: number): Promise<Holiday[]> {
    try {
      const response = await this.fetcher(`https://date.nager.at/api/v3/PublicHolidays/${year}/BR`, {
        signal: AbortSignal.timeout(5000),
        headers: { accept: 'application/json' },
      });
      if (!response.ok) throw new Error('Holiday provider returned an error');
      const parsed = z.array(providerHolidaySchema).parse(await response.json());
      const holidays = parsed
        .filter((holiday) => holiday.global && holiday.types.includes('Public') && holiday.date.startsWith(`${year}-`))
        .map(({ types: _types, ...holiday }) => holiday)
        .sort((a, b) => a.date.localeCompare(b.date));
      this.cache.set(year, { expiresAt: this.now() + this.cacheTtlMs, holidays });
      return holidays;
    } catch {
      throw new ApiError(503, 'HOLIDAYS_UNAVAILABLE',
        'Não foi possível carregar os feriados agora. Suas tarefas continuam disponíveis. Tente novamente em instantes.');
    }
  }
}
