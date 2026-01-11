import { ParsedTransaction } from './parsers/types';

export type TickerResolution = {
  ticker: string | null;
  currency?: string | null;
};

export interface TickerResolver {
  resolve(isin: string, symbol: string): Promise<TickerResolution>;
}

export interface TickerCache {
  get(key: string): Promise<TickerResolution | undefined>;
  set(key: string, value: TickerResolution): Promise<void>;
}

export interface EnrichmentOptions {
  resolver: TickerResolver;
  cache?: TickerCache;
  /**
   * If true, will not attempt to resolve if a ticker is already present.
   * Default: true
   */
  skipIfPresent?: boolean;
}

/**
 * Enriches transactions by resolving tickers using a provided resolver and optional cache.
 */
export async function enrichTransactions(
  transactions: ParsedTransaction[],
  options: EnrichmentOptions
): Promise<ParsedTransaction[]> {
  const { resolver, cache, skipIfPresent = true } = options;
  const enriched: ParsedTransaction[] = [];

  for (const t of transactions) {
    if (skipIfPresent && t.ticker) {
      enriched.push(t);
      continue;
    }

    const key = t.isin || t.symbol;
    if (!key) {
      enriched.push(t);
      continue;
    }

    let resolution: TickerResolution | undefined;

    if (cache) {
      resolution = await cache.get(key);
    }

    if (!resolution) {
      try {
        resolution = await resolver.resolve(t.isin || '', t.symbol);
        if (cache && resolution) {
          await cache.set(key, resolution);
        }
      } catch (e) {
        console.warn(`Failed to resolve ticker for ${key}`, e);
        resolution = { ticker: null };
      }
    }

    enriched.push({
      ...t,
      ticker: resolution.ticker || t.ticker,
      // If the resolver found a currency, we could potentially update it too
      // 但 ParsedTransaction has multiple currency fields.
    });
  }

  return enriched;
}

/**
 * Simple in-memory cache implementation
 */
export class MemoryTickerCache implements TickerCache {
  private cache = new Map<string, TickerResolution>();

  async get(key: string): Promise<TickerResolution | undefined> {
    return this.cache.get(key);
  }

  async set(key: string, value: TickerResolution): Promise<void> {
    this.cache.set(key, value);
  }
}
