import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  YahooISINResolver,
  YahooNameResolver,
  YahooFullResolver,
} from '../../src/resolvers/yahoo';

// Mock yahoo-finance2
vi.mock('yahoo-finance2', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      search: vi.fn(),
      quote: vi.fn(),
      quoteSummary: vi.fn(),
    })),
  };
});

// Type for accessing protected yahooFinance property in tests
type ResolverWithYahooFinance = {
  yahooFinance: {
    search: ReturnType<typeof vi.fn>;
    quote: ReturnType<typeof vi.fn>;
    quoteSummary: ReturnType<typeof vi.fn>;
  };
};

describe('Yahoo Resolvers', () => {
  describe('YahooISINResolver', () => {
    let resolver: YahooISINResolver;

    beforeEach(() => {
      resolver = new YahooISINResolver();
    });

    it('should have correct name', () => {
      expect(resolver.name).toBe('Yahoo ISIN');
    });

    it('should return null ticker if no ISIN provided', async () => {
      const result = await resolver.resolve('', 'Apple Inc');
      expect(result.ticker).toBeNull();
    });

    it('should resolve ticker from ISIN search with equity match', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        quotes: [
          { symbol: 'OTHER', quoteType: 'INDEX', currency: 'USD' },
          { symbol: 'AAPL', quoteType: 'EQUITY', currency: 'USD' },
        ],
      });
      (resolver as unknown as ResolverWithYahooFinance).yahooFinance.search =
        mockSearch;

      const result = await resolver.resolve('US0378331005', 'Apple Inc');

      expect(result.ticker).toBe('AAPL');
      expect(result.currency).toBe('USD');
      expect(mockSearch).toHaveBeenCalledWith('US0378331005');
    });

    it('should fallback to first result if no equity match', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        quotes: [{ symbol: 'INDEX1', quoteType: 'INDEX', currency: 'USD' }],
      });
      (resolver as unknown as ResolverWithYahooFinance).yahooFinance.search =
        mockSearch;

      const result = await resolver.resolve('US0001', 'Test');

      expect(result.ticker).toBe('INDEX1');
    });

    it('should enrich currency if missing', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        quotes: [{ symbol: 'AAPL', quoteType: 'EQUITY' }],
      });
      const mockQuote = vi.fn().mockResolvedValue({ currency: 'USD' });
      (resolver as unknown as ResolverWithYahooFinance).yahooFinance.search =
        mockSearch;
      (resolver as unknown as ResolverWithYahooFinance).yahooFinance.quote =
        mockQuote;

      const result = await resolver.resolve('US0378331005', 'Apple Inc');

      expect(result.ticker).toBe('AAPL');
      expect(result.currency).toBe('USD');
      expect(mockQuote).toHaveBeenCalledWith('AAPL');
    });

    it('should handle search errors gracefully', async () => {
      const mockSearch = vi.fn().mockRejectedValue(new Error('API Error'));
      (resolver as unknown as ResolverWithYahooFinance).yahooFinance.search =
        mockSearch;

      const result = await resolver.resolve('INVALID', 'Test');

      expect(result.ticker).toBeNull();
    });
  });

  describe('YahooNameResolver', () => {
    let resolver: YahooNameResolver;

    beforeEach(() => {
      resolver = new YahooNameResolver();
    });

    it('should have correct name', () => {
      expect(resolver.name).toBe('Yahoo Name');
    });

    it('should handle Alphabet Class C correctly', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        quotes: [
          {
            symbol: 'GOOG',
            quoteType: 'EQUITY',
            exchange: 'NMS',
            currency: 'USD',
          },
          {
            symbol: 'GOOGL',
            quoteType: 'EQUITY',
            exchange: 'NMS',
            currency: 'USD',
          },
        ],
      });
      (resolver as unknown as ResolverWithYahooFinance).yahooFinance.search =
        mockSearch;

      const result = await resolver.resolve('', 'Alphabet Inc Class C');

      expect(result.ticker).toBe('GOOG');
      expect(mockSearch).toHaveBeenCalledWith('Alphabet Inc');
    });

    it('should handle Alphabet Class A correctly', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        quotes: [
          {
            symbol: 'GOOG',
            quoteType: 'EQUITY',
            exchange: 'NMS',
            currency: 'USD',
          },
          {
            symbol: 'GOOGL',
            quoteType: 'EQUITY',
            exchange: 'NMS',
            currency: 'USD',
          },
        ],
      });
      (resolver as unknown as ResolverWithYahooFinance).yahooFinance.search =
        mockSearch;

      const result = await resolver.resolve('', 'Alphabet Inc Class A');

      expect(result.ticker).toBe('GOOGL');
    });

    it('should filter by preferred exchanges', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        quotes: [
          {
            symbol: 'AAPL.L',
            quoteType: 'EQUITY',
            exchange: 'LSE',
            longname: 'Apple Inc',
          },
          {
            symbol: 'AAPL',
            quoteType: 'EQUITY',
            exchange: 'NMS',
            longname: 'Apple Inc',
            currency: 'USD',
          },
        ],
      });
      (resolver as unknown as ResolverWithYahooFinance).yahooFinance.search =
        mockSearch;

      const result = await resolver.resolve('', 'Apple Inc');

      expect(result.ticker).toBe('AAPL');
    });

    it('should match by name prefix', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        quotes: [
          {
            symbol: 'AAPL',
            quoteType: 'EQUITY',
            exchange: 'NMS',
            longname: 'Apple Inc',
            currency: 'USD',
          },
          {
            symbol: 'AAPL2',
            quoteType: 'EQUITY',
            exchange: 'NMS',
            longname: 'Apple Inc Long Name',
            currency: 'USD',
          },
        ],
      });
      (resolver as unknown as ResolverWithYahooFinance).yahooFinance.search =
        mockSearch;

      const result = await resolver.resolve('', 'Apple Inc');

      expect(result.ticker).toBe('AAPL');
    });

    it('should fallback to any equity if no preferred exchange match', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        quotes: [
          { symbol: 'INDEX', quoteType: 'INDEX', exchange: 'OTHER' },
          {
            symbol: 'STOCK',
            quoteType: 'EQUITY',
            exchange: 'OTHER',
            currency: 'EUR',
          },
        ],
      });
      (resolver as unknown as ResolverWithYahooFinance).yahooFinance.search =
        mockSearch;

      const result = await resolver.resolve('', 'Some Stock');

      expect(result.ticker).toBe('STOCK');
    });

    it('should enrich currency using quoteSummary if quote fails', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        quotes: [
          {
            symbol: 'AAPL',
            quoteType: 'EQUITY',
            exchange: 'NMS',
            longname: 'Apple Inc',
          },
        ],
      });
      const mockQuote = vi.fn().mockResolvedValue({});
      const mockQuoteSummary = vi.fn().mockResolvedValue({
        price: { currency: 'USD' },
      });
      (resolver as unknown as ResolverWithYahooFinance).yahooFinance.search =
        mockSearch;
      (resolver as unknown as ResolverWithYahooFinance).yahooFinance.quote =
        mockQuote;
      (
        resolver as unknown as ResolverWithYahooFinance
      ).yahooFinance.quoteSummary = mockQuoteSummary;

      const result = await resolver.resolve('', 'Apple Inc');

      expect(result.currency).toBe('USD');
    });

    it('should handle search errors gracefully', async () => {
      const mockSearch = vi.fn().mockRejectedValue(new Error('API Error'));
      (resolver as unknown as ResolverWithYahooFinance).yahooFinance.search =
        mockSearch;

      const result = await resolver.resolve('', 'Test');

      expect(result.ticker).toBeNull();
    });
  });

  describe('YahooFullResolver', () => {
    let resolver: YahooFullResolver;

    beforeEach(() => {
      resolver = new YahooFullResolver();
    });

    it('should have correct name', () => {
      expect(resolver.name).toBe('Yahoo Full');
    });

    it('should use ISIN resolver first', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        quotes: [{ symbol: 'AAPL', quoteType: 'EQUITY', currency: 'USD' }],
      });
      (resolver as unknown as ResolverWithYahooFinance).yahooFinance.search =
        mockSearch;

      const result = await resolver.resolve('US0378331005', 'Apple Inc');

      expect(result.ticker).toBe('AAPL');
      expect(mockSearch).toHaveBeenCalledWith('US0378331005');
    });

    it('should fallback to name resolver if ISIN fails', async () => {
      const mockSearch = vi
        .fn()
        .mockResolvedValueOnce({ quotes: [] })
        .mockResolvedValueOnce({
          quotes: [
            {
              symbol: 'AAPL',
              quoteType: 'EQUITY',
              exchange: 'NMS',
              longname: 'Apple Inc',
              currency: 'USD',
            },
          ],
        });
      (resolver as unknown as ResolverWithYahooFinance).yahooFinance.search =
        mockSearch;

      const result = await resolver.resolve('INVALID', 'Apple Inc');

      expect(result.ticker).toBe('AAPL');
      expect(mockSearch).toHaveBeenCalledTimes(2);
    });
  });
});
