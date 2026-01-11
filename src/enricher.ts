import { ParsedTransaction } from './parsers/types';

export type TickerResolution = {
  ticker: string | null;
  currency?: string | null;
};

export interface TickerResolver {
  name: string;
  resolve(isin: string, symbol: string): Promise<TickerResolution>;
}

export interface TickerCache {
  get(key: string): Promise<TickerResolution | undefined>;
  set(key: string, value: TickerResolution): Promise<void>;
}

export interface EnrichmentOptions {
  resolvers: TickerResolver[];
  cache?: TickerCache;
  /**
   * If true, will not attempt to resolve if a ticker is already present.
   * Default: true
   */
  skipIfPresent?: boolean;
  /**
   * If true, will stop trying resolvers for a transaction once one returns a ticker.
   * Default: true
   */
  stopOnFirstMatch?: boolean;
}

/**
 * Enriches transactions by resolving tickers using one or more resolvers in sequence.
 */
export async function enrichTransactions(
  transactions: ParsedTransaction[],
  options: EnrichmentOptions
): Promise<ParsedTransaction[]> {
  const {
    resolvers,
    cache,
    skipIfPresent = true,
    stopOnFirstMatch = true,
  } = options;
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

    // 1. Check Cache
    if (cache) {
      resolution = await cache.get(key);
    }

    // 2. Run Resolvers
    if (!resolution || !resolution.ticker) {
      for (const resolver of resolvers) {
        try {
          const res = await resolver.resolve(t.isin || '', t.symbol);
          if (res && res.ticker) {
            resolution = res;
            if (stopOnFirstMatch) break;
          }
        } catch (e) {
          console.warn(`Resolver ${resolver.name} failed for ${key}`, e);
        }
      }
    }

    // 3. Update Cache if we found something new
    if (cache && resolution && resolution.ticker) {
      await cache.set(key, resolution);
    }

    enriched.push({
      ...t,
      ticker: resolution?.ticker || t.ticker,
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
