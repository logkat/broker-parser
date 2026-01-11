import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { FileTickerResolver } from '../src/resolvers/file';

describe('FileTickerResolver', () => {
  const tempJson = path.join(__dirname, 'temp_tickers.json');
  const tempCsv = path.join(__dirname, 'temp_tickers.csv');

  it('should resolve tickers from a JSON file', async () => {
    fs.writeFileSync(
      tempJson,
      JSON.stringify({
        US0378331005: 'AAPL',
        Microsoft: 'MSFT',
      })
    );

    const resolver = new FileTickerResolver(tempJson);

    expect((await resolver.resolve('US0378331005', 'Apple')).ticker).toBe(
      'AAPL'
    );
    expect((await resolver.resolve('', 'Microsoft')).ticker).toBe('MSFT');
    expect((await resolver.resolve('UNKNOWN', 'Unknown')).ticker).toBe(null);

    fs.unlinkSync(tempJson);
  });

  it('should resolve tickers from a CSV file', async () => {
    fs.writeFileSync(
      tempCsv,
      'isin,name,ticker\nUS0378331005,Apple,AAPL\n,Microsoft,MSFT'
    );

    const resolver = new FileTickerResolver(tempCsv);

    expect((await resolver.resolve('US0378331005', 'Apple')).ticker).toBe(
      'AAPL'
    );
    expect((await resolver.resolve('', 'Microsoft')).ticker).toBe('MSFT');

    fs.unlinkSync(tempCsv);
  });
});
