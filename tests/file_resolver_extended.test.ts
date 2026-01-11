import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { FileTickerResolver } from '../src/resolvers/file';

describe('FileTickerResolver - Extended', () => {
  const tempDir = path.join(__dirname, 'temp_resolver_files');

  beforeEach(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('JSON Array Format', () => {
    it('should resolve from array with isin field', async () => {
      const filePath = path.join(tempDir, 'array_isin.json');
      fs.writeFileSync(
        filePath,
        JSON.stringify([
          { isin: 'US0378331005', ticker: 'AAPL' },
          { isin: 'US30303M1027', ticker: 'META' },
        ])
      );

      const resolver = new FileTickerResolver(filePath);
      const result = await resolver.resolve('US0378331005', 'Apple Inc');

      expect(result.ticker).toBe('AAPL');
    });

    it('should resolve from array with name field', async () => {
      const filePath = path.join(tempDir, 'array_name.json');
      fs.writeFileSync(
        filePath,
        JSON.stringify([
          { name: 'Apple Inc', ticker: 'AAPL' },
          { name: 'Meta Platforms A', ticker: 'META' },
        ])
      );

      const resolver = new FileTickerResolver(filePath);
      const result = await resolver.resolve('', 'Apple Inc');

      expect(result.ticker).toBe('AAPL');
    });

    it('should prioritize isin over name in array', async () => {
      const filePath = path.join(tempDir, 'array_priority.json');
      fs.writeFileSync(
        filePath,
        JSON.stringify([
          { isin: 'US0378331005', name: 'Apple Inc', ticker: 'AAPL' },
        ])
      );

      const resolver = new FileTickerResolver(filePath);
      const result = await resolver.resolve('US0378331005', 'Wrong Name');

      expect(result.ticker).toBe('AAPL');
    });

    it('should skip entries without ticker', async () => {
      const filePath = path.join(tempDir, 'array_no_ticker.json');
      fs.writeFileSync(
        filePath,
        JSON.stringify([
          { isin: 'US0378331005' }, // No ticker
          { name: 'Apple Inc', ticker: 'AAPL' },
        ])
      );

      const resolver = new FileTickerResolver(filePath);
      const result1 = await resolver.resolve('US0378331005', '');
      const result2 = await resolver.resolve('', 'Apple Inc');

      expect(result1.ticker).toBeNull();
      expect(result2.ticker).toBe('AAPL');
    });
  });

  describe('JSON Object Format', () => {
    it('should resolve from simple object', async () => {
      const filePath = path.join(tempDir, 'object.json');
      fs.writeFileSync(
        filePath,
        JSON.stringify({
          US0378331005: 'AAPL',
          'Meta Platforms A': 'META',
        })
      );

      const resolver = new FileTickerResolver(filePath);
      const result1 = await resolver.resolve('US0378331005', '');
      const result2 = await resolver.resolve('', 'Meta Platforms A');

      expect(result1.ticker).toBe('AAPL');
      expect(result2.ticker).toBe('META');
    });

    it('should skip non-string values in object', async () => {
      const filePath = path.join(tempDir, 'object_invalid.json');
      fs.writeFileSync(
        filePath,
        JSON.stringify({
          US0378331005: 'AAPL',
          INVALID: 123, // Not a string
          ANOTHER: { nested: 'object' }, // Not a string
        })
      );

      const resolver = new FileTickerResolver(filePath);
      const result1 = await resolver.resolve('US0378331005', '');
      const result2 = await resolver.resolve('INVALID', '');
      const result3 = await resolver.resolve('ANOTHER', '');

      expect(result1.ticker).toBe('AAPL');
      expect(result2.ticker).toBeNull();
      expect(result3.ticker).toBeNull();
    });
  });

  describe('CSV Format', () => {
    it('should resolve from CSV with lowercase headers', async () => {
      const filePath = path.join(tempDir, 'lowercase.csv');
      fs.writeFileSync(
        filePath,
        'isin,name,ticker\nUS0378331005,Apple Inc,AAPL\n,Meta Platforms A,META'
      );

      const resolver = new FileTickerResolver(filePath);
      const result1 = await resolver.resolve('US0378331005', '');
      const result2 = await resolver.resolve('', 'Meta Platforms A');

      expect(result1.ticker).toBe('AAPL');
      expect(result2.ticker).toBe('META');
    });

    it('should resolve from CSV with Ticker header (capitalized)', async () => {
      const filePath = path.join(tempDir, 'capitalized.csv');
      fs.writeFileSync(
        filePath,
        'isin,name,Ticker\nUS0378331005,Apple Inc,AAPL'
      );

      const resolver = new FileTickerResolver(filePath);
      const result = await resolver.resolve('US0378331005', '');

      expect(result.ticker).toBe('AAPL');
    });

    it('should skip rows without ticker', async () => {
      const filePath = path.join(tempDir, 'missing_ticker.csv');
      fs.writeFileSync(
        filePath,
        'isin,name,ticker\nUS0378331005,Apple Inc,\n,Meta Platforms A,META'
      );

      const resolver = new FileTickerResolver(filePath);
      const result1 = await resolver.resolve('US0378331005', '');
      const result2 = await resolver.resolve('', 'Meta Platforms A');

      expect(result1.ticker).toBeNull();
      expect(result2.ticker).toBe('META');
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent file gracefully', async () => {
      const resolver = new FileTickerResolver('/non/existent/file.json');
      const result = await resolver.resolve('US0378331005', 'Apple Inc');

      expect(result.ticker).toBeNull();
    });

    it('should handle invalid JSON gracefully', async () => {
      const filePath = path.join(tempDir, 'invalid.json');
      fs.writeFileSync(filePath, 'invalid json {]');

      const resolver = new FileTickerResolver(filePath);
      const result = await resolver.resolve('US0378331005', 'Apple Inc');

      expect(result.ticker).toBeNull();
    });

    it('should handle malformed CSV gracefully', async () => {
      const filePath = path.join(tempDir, 'malformed.csv');
      fs.writeFileSync(filePath, 'isin,name,ticker\n"unclosed quote');

      const resolver = new FileTickerResolver(filePath);
      const result = await resolver.resolve('US0378331005', 'Apple Inc');

      // Should not throw, just return null
      expect(result.ticker).toBeNull();
    });

    it('should handle unsupported file extensions', async () => {
      const filePath = path.join(tempDir, 'data.txt');
      fs.writeFileSync(filePath, 'some text data');

      const resolver = new FileTickerResolver(filePath);
      const result = await resolver.resolve('US0378331005', 'Apple Inc');

      expect(result.ticker).toBeNull();
    });
  });

  describe('Resolver Name', () => {
    it('should have correct name property', () => {
      const resolver = new FileTickerResolver('/dummy/path.json');
      expect(resolver.name).toBe('File Resolver');
    });
  });
});
