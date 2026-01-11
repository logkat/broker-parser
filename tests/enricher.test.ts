import { describe, it, expect, vi } from 'vitest';
import { enrichTransactions } from '../src/enricher';
import { ParsedTransaction } from '../src/parsers/types';

describe('Enricher', () => {
    it('should enrich transactions with tickers using resolver', async () => {
        const transactions=[
            { symbol: 'Apple', isin: 'US0001', ticker: undefined } as ParsedTransaction,
            { symbol: 'Microsoft', isin: 'US0002', ticker: undefined } as ParsedTransaction,
        ];

        const resolver=vi.fn().mockImplementation(async (isin, name) => {
            if (isin==='US0001') return 'AAPL';
            if (name==='Microsoft') return 'MSFT';
            return null;
        });

        const enriched=await enrichTransactions(transactions, resolver);

        expect(enriched[0].ticker).toBe('AAPL');
        expect(enriched[1].ticker).toBe('MSFT');
        expect(resolver).toHaveBeenCalledTimes(2);
    });

    it('should use cache for repeated ISINs', async () => {
        const transactions=[
            { symbol: 'Apple', isin: 'US0001' } as ParsedTransaction,
            { symbol: 'Apple', isin: 'US0001' } as ParsedTransaction,
        ];

        const resolver=vi.fn().mockResolvedValue('AAPL');
        await enrichTransactions(transactions, resolver);

        expect(resolver).toHaveBeenCalledTimes(1);
    });

    it('should skip transactions that already have tickers', async () => {
        const transactions=[
            { symbol: 'Apple', isin: 'US0001', ticker: 'EXISTING' } as ParsedTransaction,
        ];
        const resolver=vi.fn();
        const enriched=await enrichTransactions(transactions, resolver);

        expect(enriched[0].ticker).toBe('EXISTING');
        expect(resolver).not.toHaveBeenCalled();
    });
});
