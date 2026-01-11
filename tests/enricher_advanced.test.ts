import { describe, it, expect, vi } from 'vitest';
import {
  enrichTransactions,
  MemoryTickerCache,
  TickerResolver,
} from '../src/enricher';
import { ParsedTransaction } from '../src/parsers/types';

describe('Enricher - Advanced Scenarios', () => {
  describe('Multiple Resolver Stacking', () => {
    it('should try resolvers in order until one succeeds', async () => {
      const transactions = [
        {
          name: 'Apple Inc',
          isin: 'US0378331005',
          ticker: undefined,
        } as ParsedTransaction,
      ];

      const resolver1: TickerResolver = {
        name: 'Resolver 1',
        resolve: vi.fn().mockResolvedValue({ ticker: null }),
      };

      const resolver2: TickerResolver = {
        name: 'Resolver 2',
        resolve: vi.fn().mockResolvedValue({ ticker: 'AAPL', currency: 'USD' }),
      };

      const resolver3: TickerResolver = {
        name: 'Resolver 3',
        resolve: vi.fn().mockResolvedValue({ ticker: 'AAPL2' }),
      };

      const enriched = await enrichTransactions(transactions, {
        resolvers: [resolver1, resolver2, resolver3],
      });

      expect(enriched[0].ticker).toBe('AAPL');
      expect(resolver1.resolve).toHaveBeenCalledTimes(1);
      expect(resolver2.resolve).toHaveBeenCalledTimes(1);
      expect(resolver3.resolve).not.toHaveBeenCalled(); // Should stop after resolver2
    });

    it('should continue to next resolver if stopOnFirstMatch is false', async () => {
      const transactions = [
        {
          name: 'Apple Inc',
          isin: 'US0378331005',
          ticker: undefined,
        } as ParsedTransaction,
      ];

      const resolver1: TickerResolver = {
        name: 'Resolver 1',
        resolve: vi.fn().mockResolvedValue({ ticker: 'AAPL1' }),
      };

      const resolver2: TickerResolver = {
        name: 'Resolver 2',
        resolve: vi.fn().mockResolvedValue({ ticker: 'AAPL2' }),
      };

      await enrichTransactions(transactions, {
        resolvers: [resolver1, resolver2],
        stopOnFirstMatch: false,
      });

      expect(resolver1.resolve).toHaveBeenCalledTimes(1);
      expect(resolver2.resolve).toHaveBeenCalledTimes(1);
    });

    it('should handle resolver errors gracefully', async () => {
      const transactions = [
        {
          name: 'Apple Inc',
          isin: 'US0378331005',
          ticker: undefined,
        } as ParsedTransaction,
      ];

      const resolver1: TickerResolver = {
        name: 'Resolver 1',
        resolve: vi.fn().mockRejectedValue(new Error('API Error')),
      };

      const resolver2: TickerResolver = {
        name: 'Resolver 2',
        resolve: vi.fn().mockResolvedValue({ ticker: 'AAPL' }),
      };

      const enriched = await enrichTransactions(transactions, {
        resolvers: [resolver1, resolver2],
      });

      expect(enriched[0].ticker).toBe('AAPL');
    });
  });

  describe('Cache Integration', () => {
    it('should use cached value and skip resolvers', async () => {
      const transactions = [
        {
          name: 'Apple Inc',
          isin: 'US0378331005',
          ticker: undefined,
        } as ParsedTransaction,
      ];

      const cache = new MemoryTickerCache();
      await cache.set('US0378331005', { ticker: 'AAPL', currency: 'USD' });

      const resolver: TickerResolver = {
        name: 'Test Resolver',
        resolve: vi.fn().mockResolvedValue({ ticker: 'SHOULD_NOT_USE' }),
      };

      const enriched = await enrichTransactions(transactions, {
        resolvers: [resolver],
        cache,
      });

      expect(enriched[0].ticker).toBe('AAPL');
      expect(resolver.resolve).not.toHaveBeenCalled();
    });

    it('should cache newly resolved tickers', async () => {
      const transactions = [
        {
          name: 'Apple Inc',
          isin: 'US0378331005',
          ticker: undefined,
        } as ParsedTransaction,
      ];

      const cache = new MemoryTickerCache();
      const resolver: TickerResolver = {
        name: 'Test Resolver',
        resolve: vi.fn().mockResolvedValue({ ticker: 'AAPL', currency: 'USD' }),
      };

      await enrichTransactions(transactions, {
        resolvers: [resolver],
        cache,
      });

      const cached = await cache.get('US0378331005');
      expect(cached).toEqual({ ticker: 'AAPL', currency: 'USD' });
    });

    it('should use name as cache key if ISIN is missing', async () => {
      const transactions = [
        {
          name: 'Apple Inc',
          ticker: undefined,
        } as ParsedTransaction,
      ];

      const cache = new MemoryTickerCache();
      const resolver: TickerResolver = {
        name: 'Test Resolver',
        resolve: vi.fn().mockResolvedValue({ ticker: 'AAPL' }),
      };

      await enrichTransactions(transactions, {
        resolvers: [resolver],
        cache,
      });

      const cached = await cache.get('Apple Inc');
      expect(cached?.ticker).toBe('AAPL');
    });
  });

  describe('Edge Cases', () => {
    it('should skip transactions without name or ISIN', async () => {
      const transactions = [
        {
          ticker: undefined,
        } as ParsedTransaction,
      ];

      const resolver: TickerResolver = {
        name: 'Test Resolver',
        resolve: vi.fn(),
      };

      const enriched = await enrichTransactions(transactions, {
        resolvers: [resolver],
      });

      expect(enriched[0].ticker).toBeUndefined();
      expect(resolver.resolve).not.toHaveBeenCalled();
    });

    it('should skip transactions with skipIfPresent=true (default)', async () => {
      const transactions = [
        {
          name: 'Apple Inc',
          isin: 'US0378331005',
          ticker: 'EXISTING',
        } as ParsedTransaction,
      ];

      const resolver: TickerResolver = {
        name: 'Test Resolver',
        resolve: vi.fn().mockResolvedValue({ ticker: 'AAPL' }),
      };

      const enriched = await enrichTransactions(transactions, {
        resolvers: [resolver],
      });

      expect(enriched[0].ticker).toBe('EXISTING');
      expect(resolver.resolve).not.toHaveBeenCalled();
    });

    it('should re-resolve if skipIfPresent=false', async () => {
      const transactions = [
        {
          name: 'Apple Inc',
          isin: 'US0378331005',
          ticker: 'EXISTING',
        } as ParsedTransaction,
      ];

      const resolver: TickerResolver = {
        name: 'Test Resolver',
        resolve: vi.fn().mockResolvedValue({ ticker: 'AAPL' }),
      };

      const enriched = await enrichTransactions(transactions, {
        resolvers: [resolver],
        skipIfPresent: false,
      });

      expect(enriched[0].ticker).toBe('AAPL');
      expect(resolver.resolve).toHaveBeenCalled();
    });

    it('should preserve original ticker if all resolvers fail', async () => {
      const transactions = [
        {
          name: 'Unknown Stock',
          isin: 'UNKNOWN',
          ticker: 'ORIGINAL',
        } as ParsedTransaction,
      ];

      const resolver: TickerResolver = {
        name: 'Test Resolver',
        resolve: vi.fn().mockResolvedValue({ ticker: null }),
      };

      const enriched = await enrichTransactions(transactions, {
        resolvers: [resolver],
        skipIfPresent: false,
      });

      expect(enriched[0].ticker).toBe('ORIGINAL');
    });

    it('should handle empty resolver array', async () => {
      const transactions = [
        {
          name: 'Apple Inc',
          isin: 'US0378331005',
          ticker: undefined,
        } as ParsedTransaction,
      ];

      const enriched = await enrichTransactions(transactions, {
        resolvers: [],
      });

      expect(enriched[0].ticker).toBeUndefined();
    });
  });
});
