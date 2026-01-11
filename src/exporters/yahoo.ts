import { ParsedTransaction } from '../parsers/types';
import { PortfolioExporter, ExportResult } from './types';

export const YahooFinanceExporter: PortfolioExporter = {
  name: 'Yahoo Finance',
  export(transactions: ParsedTransaction[]): ExportResult {
    const headers = [
      'Symbol',
      'Trade Date', // YYYYMMDD
      'Purchase Price',
      'Quantity',
      'Commission',
      'Comment',
    ];

    const rows = transactions
      .map((t) => {
        // Yahoo Finance expects a ticker symbol. Prefer resolved 'ticker', fallback to 'name'
        const symbol = t.ticker || t.name;

        // Skip non-trade types?
        if (t.type !== 'BUY' && t.type !== 'SELL') {
          return null;
        }

        const dateStr = t.date.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
        const qty =
          t.type === 'SELL' ? -Math.abs(t.quantity) : Math.abs(t.quantity);
        const price = t.price || 0;
        const commission = t.fee || 0;
        const comment = `Imported from ${t.originalSource || 'Broker'}`;

        // Escape helper
        const escape = (val: string) => {
          if (val.includes(',') || val.includes('"')) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        };

        return [
          escape(symbol),
          dateStr,
          price.toFixed(4),
          qty.toString(),
          commission.toFixed(4),
          escape(comment),
        ].join(',');
      })
      .filter((row): row is string => row !== null);

    const content = [headers.join(','), ...rows].join('\n');

    return {
      filename: 'yahoo_finance_import.csv',
      content,
      mimeType: 'text/csv',
    };
  },
};
