import { describe, it, expect } from 'vitest';
import { YahooFinanceExporter } from '../../src/exporters/yahoo';
import { ParsedTransaction } from '../../src/parsers/types';

describe('YahooFinanceExporter', () => {
  it('should export transactions to CSV', () => {
    const transactions: ParsedTransaction[] = [
      {
        date: new Date('2023-01-01'),
        type: 'BUY',
        symbol: 'Apple Inc',
        ticker: 'AAPL',
        quantity: 10,
        price: 150.0,
        total: 1500,
        currency: 'USD',
        fee: 5.0,
        originalSource: 'TestBroker',
      } as ParsedTransaction,
      {
        date: new Date('2023-02-01'),
        type: 'SELL',
        symbol: 'Apple Inc',
        ticker: 'AAPL',
        quantity: 5,
        price: 160.0,
        total: 800,
        currency: 'USD',
        fee: 5.0,
        originalSource: 'TestBroker',
      } as ParsedTransaction,
    ];

    const result = YahooFinanceExporter.export(transactions);

    expect(result.filename).toBe('yahoo_finance_import.csv');
    expect(result.mimeType).toBe('text/csv');

    const lines = result.content.split('\n');
    expect(lines.length).toBe(3); // Header + 2 rows

    expect(lines[0]).toBe(
      'Symbol,Trade Date,Purchase Price,Quantity,Commission,Comment'
    );
    expect(lines[1]).toContain('AAPL');
    expect(lines[1]).toContain('10');
    expect(lines[2]).toContain('-5');
  });

  it('should fallback to symbol if ticker is missing', () => {
    const t = [
      {
        date: new Date('2023-01-01'),
        type: 'BUY',
        symbol: 'Unknown Stock',
        quantity: 1,
        price: 100,
        fee: 0,
        originalSource: 'Test',
      },
    ] as ParsedTransaction[];

    const result = YahooFinanceExporter.export(t);
    expect(result.content).toContain('Unknown Stock');
  });
});
