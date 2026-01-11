import { describe, it, expect, vi } from 'vitest';
import {
  enrichTransactions,
  MemoryTickerCache,
  TickerResolver,
} from '../src/enricher';
import { ParsedTransaction } from '../src/parsers/types';

describe('Enricher', () => {
  it('should enrich transactions with tickers using multiple resolvers', async () => {
    const transactions = [
      {
        name: 'Apple',
        isin: 'US0001',
        ticker: undefined,
      } as ParsedTransaction,
      {
        name: 'Microsoft',
        isin: 'US0002',
        ticker: undefined,
      } as ParsedTransaction,
    ];

    const resolver: TickerResolver = {
      name: 'Test Resolver',
      resolve: vi.fn().mockImplementation(async (isin, name) => {
        if (isin === 'US0001') return { ticker: 'AAPL' };
        if (name === 'Microsoft') return { ticker: 'MSFT' };
        return { ticker: null };
      }),
    };

    const enriched = await enrichTransactions(transactions, {
      resolvers: [resolver],
    });

    expect(enriched[0].ticker).toBe('AAPL');
    expect(enriched[1].ticker).toBe('MSFT');
    expect(resolver.resolve).toHaveBeenCalledTimes(2);
  });

  it('should use cache for repeated names', async () => {
    const transactions = [
      { name: 'Apple', isin: 'US0001' } as ParsedTransaction,
      { name: 'Apple', isin: 'US0001' } as ParsedTransaction,
    ];

    const resolver: TickerResolver = {
      name: 'Test Resolver',
      resolve: vi.fn().mockResolvedValue({ ticker: 'AAPL' }),
    };
    const cache = new MemoryTickerCache();

    await enrichTransactions(transactions, {
      resolvers: [resolver],
      cache,
    });

    expect(resolver.resolve).toHaveBeenCalledTimes(1);
  });

  it('should skip transactions that already have tickers', async () => {
    const transactions = [
      {
        name: 'Apple',
        isin: 'US0001',
        ticker: 'EXISTING',
      } as ParsedTransaction,
    ];
    const resolver: TickerResolver = {
      name: 'Test',
      resolve: vi.fn(),
    };
    const enriched = await enrichTransactions(transactions, {
      resolvers: [resolver],
    });

    expect(enriched[0].ticker).toBe('EXISTING');
    expect(resolver.resolve).not.toHaveBeenCalled();
  });
});
