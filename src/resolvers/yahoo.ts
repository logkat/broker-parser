import YahooFinance from 'yahoo-finance2';
import { TickerResolver, TickerResolution } from '../enricher';

// Yahoo Finance API types (simplified)
interface YahooQuote {
  symbol: string;
  quoteType?: string;
  exchange?: string;
  currency?: string;
  longname?: string;
  shortname?: string;
}

interface YahooSearchResult {
  quotes: YahooQuote[];
}

interface YahooQuoteResult {
  currency?: string;
}

interface YahooQuoteSummaryResult {
  price?: { currency?: string };
  summaryDetail?: { currency?: string };
}

// Create a single instance to be used across resolvers
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

abstract class YahooBaseResolver {
  protected yahooFinance = yahooFinance;

  protected async enrichCurrency(ticker: string): Promise<string | null> {
    try {
      const quote = (await this.yahooFinance.quote(ticker)) as YahooQuoteResult;
      let currency = quote.currency || null;
      if (!currency) {
        const summary = (await this.yahooFinance.quoteSummary(ticker, {
          modules: ['summaryDetail', 'price'],
        })) as YahooQuoteSummaryResult;
        currency =
          summary.price?.currency || summary.summaryDetail?.currency || null;
      }
      return currency;
    } catch {
      return null;
    }
  }
}

/**
 * Resolves tickers using Yahoo Finance ISIN search.
 */
export class YahooISINResolver
  extends YahooBaseResolver
  implements TickerResolver
{
  name = 'Yahoo ISIN';

  async resolve(isin: string, name: string): Promise<TickerResolution> {
    if (!isin) return { ticker: null };

    try {
      const results = (await this.yahooFinance.search(
        isin
      )) as YahooSearchResult;
      if (results && results.quotes && results.quotes.length > 0) {
        const equityMatch = results.quotes.find(
          (q) => q.quoteType === 'EQUITY' || q.quoteType === 'ETF'
        );
        const match = equityMatch || results.quotes[0];
        const ticker = match.symbol;
        let currency = match.currency || null;

        if (ticker && !currency) {
          currency = await this.enrichCurrency(ticker);
        }

        return { ticker, currency };
      }
    } catch (error) {
      console.warn(`Yahoo ISIN failed for ${name}:`, error);
    }

    return { ticker: null };
  }
}

/**
 * Resolves tickers using Yahoo Finance name search with advanced matching.
 */
export class YahooNameResolver
  extends YahooBaseResolver
  implements TickerResolver
{
  name = 'Yahoo Name';

  async resolve(isin: string, name: string): Promise<TickerResolution> {
    let cleanName = name;
    let preferredClass: string | null = null;

    const classMatch =
      name.match(/\s+Class\s+([A-Z])$/i) || name.match(/\s+([A-Z])$/);
    if (classMatch) {
      preferredClass = classMatch[1].toUpperCase();
      cleanName = name.substring(0, classMatch.index).trim();
    }

    if (cleanName.toLowerCase() === 'alphabet') {
      cleanName = 'Alphabet Inc';
    }

    try {
      const results = (await this.yahooFinance.search(
        cleanName
      )) as YahooSearchResult;
      if (results && results.quotes && results.quotes.length > 0) {
        const candidates = results.quotes.filter(
          (q) =>
            (q.exchange === 'NMS' ||
              q.exchange === 'NYQ' ||
              q.exchange === 'NGM') &&
            (q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
        );

        let resolvedTicker: string | null = null;
        let resolvedCurrency: string | null = null;

        if (candidates.length > 0) {
          // 1. Special case: Alphabet
          if (cleanName.toLowerCase().includes('alphabet')) {
            if (preferredClass === 'C') {
              const found = candidates.find((q) => q.symbol === 'GOOG');
              if (found) {
                resolvedTicker = found.symbol;
                resolvedCurrency = found.currency || 'USD';
              }
            } else if (preferredClass === 'A') {
              const found = candidates.find((q) => q.symbol === 'GOOGL');
              if (found) {
                resolvedTicker = found.symbol;
                resolvedCurrency = found.currency || 'USD';
              }
            }
          }

          // 2. Exact match starting with name
          if (!resolvedTicker) {
            const matches = candidates
              .filter((q) =>
                (q.longname || q.shortname || '')
                  .toLowerCase()
                  .startsWith(cleanName.toLowerCase())
              )
              .sort(
                (a, b) =>
                  (a.longname || a.shortname || '').length -
                  (b.longname || b.shortname || '').length
              );

            if (matches.length > 0) {
              resolvedTicker = matches[0].symbol;
              resolvedCurrency = matches[0].currency || null;
            }
          }

          // 3. First candidate
          if (!resolvedTicker) {
            resolvedTicker = candidates[0].symbol;
            resolvedCurrency = candidates[0].currency || null;
          }
        }

        // 4. Any equity match if no candidates matched the preferred exchanges
        if (!resolvedTicker) {
          const anyEquity = results.quotes.find(
            (q) => q.quoteType === 'EQUITY' || q.quoteType === 'ETF'
          );
          if (anyEquity) {
            resolvedTicker = anyEquity.symbol;
            resolvedCurrency = anyEquity.currency || null;
          }
        }

        // 5. Absolute fallback
        if (!resolvedTicker) {
          resolvedTicker = results.quotes[0].symbol;
          resolvedCurrency = results.quotes[0].currency || null;
        }

        if (resolvedTicker && !resolvedCurrency) {
          resolvedCurrency = await this.enrichCurrency(resolvedTicker);
        }

        return { ticker: resolvedTicker, currency: resolvedCurrency };
      }
    } catch (error) {
      console.warn(`Yahoo Name failed for ${name}:`, error);
    }

    return { ticker: null };
  }
}

/**
 * Combined resolver that mimics the original Yahoo resolution logic.
 */
export class YahooFullResolver
  extends YahooBaseResolver
  implements TickerResolver
{
  name = 'Yahoo Full';
  private isinResolver = new YahooISINResolver();
  private nameResolver = new YahooNameResolver();

  async resolve(isin: string, name: string): Promise<TickerResolution> {
    const isinRes = await this.isinResolver.resolve(isin, name);
    if (isinRes.ticker) return isinRes;
    return this.nameResolver.resolve(isin, name);
  }
}
