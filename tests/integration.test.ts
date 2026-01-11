import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { parseTransaction } from '../src/index';

describe('Integration Tests with Mocks', () => {
  const mocksDir = path.resolve(__dirname, 'mocks');

  it('should parse the Avanza mock CSV correctly', () => {
    const csvData = fs.readFileSync(path.join(mocksDir, 'avanza.csv'), 'utf8');
    const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });

    const transactions = (parsed.data as Record<string, string>[])
      .map((row) => parseTransaction(row, 'Avanza'))
      .filter((t) => t !== null);

    expect(transactions.length).toBeGreaterThan(0);
    expect(transactions[0]?.originalSource).toBe('Avanza');
    expect(transactions[0]?.name).toBe('Meta Platforms A');
  });

  it('should parse the Nordnet mock CSV correctly', () => {
    const csvData = fs.readFileSync(path.join(mocksDir, 'nordnet.csv'), 'utf8');
    const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });

    const transactions = (parsed.data as Record<string, string>[])
      .map((row) => parseTransaction(row, 'Nordnet'))
      .filter((t) => t !== null);

    expect(transactions.length).toBeGreaterThan(0);
    expect(transactions[0]?.originalSource).toBe('Nordnet');
    expect(transactions[0]?.name).toBe('Netflix');
  });

  it('should auto-detect formats from mock files', () => {
    const avanzaCsv = fs.readFileSync(
      path.join(mocksDir, 'avanza.csv'),
      'utf8'
    );
    const avanzaRow = Papa.parse(avanzaCsv, { header: true }).data[0] as any;
    expect(parseTransaction(avanzaRow, 'Auto')?.originalSource).toBe('Avanza');

    const nordnetCsv = fs.readFileSync(
      path.join(mocksDir, 'nordnet.csv'),
      'utf8'
    );
    const nordnetRow = Papa.parse(nordnetCsv, { header: true }).data[0] as any;
    expect(parseTransaction(nordnetRow, 'Auto')?.originalSource).toBe(
      'Nordnet'
    );
  });
});
