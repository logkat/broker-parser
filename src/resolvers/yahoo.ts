import YahooFinance from 'yahoo-finance2';
import { TickerResolver, TickerResolution } from '../enricher';

export class YahooTickerResolver implements TickerResolver {
  private yahooFinance: typeof YahooFinance;

  constructor() {
    // @ts-ignore - yahoo-finance2 export can be tricky depending on build
    this.yahooFinance = YahooFinance.default || YahooFinance;
    try {
      (this.yahooFinance as any).suppressNotices(['yahooSurvey']);
    } catch (e) {}
  }

  async resolve(isin: string, symbol: string): Promise<TickerResolution> {
    let resolvedTicker: string | null = null;
    let resolvedCurrency: string | null = null;

    try {
      // 1. ISIN Search
      if (isin) {
        const isinResults: any = await this.yahooFinance.search(isin);
        if (
          isinResults &&
          isinResults.quotes &&
          isinResults.quotes.length > 0
        ) {
          const equityMatch = isinResults.quotes.find(
            (q: any) => q.quoteType === 'EQUITY' || q.quoteType === 'ETF'
          );
          if (equityMatch) {
            resolvedTicker = equityMatch.symbol;
            resolvedCurrency = equityMatch.currency || null;
          } else {
            resolvedTicker = isinResults.quotes[0].symbol;
            resolvedCurrency = (isinResults.quotes[0] as any).currency || null;
          }
        }
      }

      // 2. Name Search (Fallback)
      if (!resolvedTicker) {
        let cleanName = symbol;
        const classMatch =
          symbol.match(/\s+Class\s+([A-Z])$/i) || symbol.match(/\s+([A-Z])$/);
        if (classMatch) {
          cleanName = symbol.substring(0, classMatch.index).trim();
        }

        if (cleanName.toLowerCase() === 'alphabet') {
          cleanName = 'Alphabet Inc';
        }

        const results: any = await this.yahooFinance.search(cleanName);
        if (results && results.quotes && results.quotes.length > 0) {
          const candidates = results.quotes.filter(
            (q: any) =>
              (q.exchange === 'NMS' ||
                q.exchange === 'NYQ' ||
                q.exchange === 'NGM') &&
              (q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
          );

          if (candidates.length > 0) {
            // Simple logic for Alphabet
            if (cleanName.toLowerCase().includes('alphabet')) {
              if (symbol.includes('Class C')) {
                const found = candidates.find((q: any) => q.symbol === 'GOOG');
                if (found) resolvedTicker = found.symbol;
              } else {
                const found = candidates.find((q: any) => q.symbol === 'GOOGL');
                if (found) resolvedTicker = found.symbol;
              }
            }

            if (!resolvedTicker) {
              resolvedTicker = candidates[0].symbol;
              resolvedCurrency = candidates[0].currency || null;
            }
          } else {
            resolvedTicker = results.quotes[0].symbol;
            resolvedCurrency = results.quotes[0].currency || null;
          }
        }
      }
    } catch (error) {
      console.warn(`Yahoo resolve error for ${symbol}:`, error);
    }

    return { ticker: resolvedTicker, currency: resolvedCurrency };
  }
}
