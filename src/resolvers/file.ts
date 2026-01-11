import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { TickerResolver, TickerResolution } from '../enricher';

export class FileTickerResolver implements TickerResolver {
  name = 'File Resolver';
  private mappings: Map<string, string> = new Map();

  constructor(filePath: string) {
    this.load(filePath);
  }

  private load(filePath: string) {
    if (!fs.existsSync(filePath)) {
      console.warn(`Ticker file not found: ${filePath}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const content = fs.readFileSync(filePath, 'utf8');

    if (ext === '.json') {
      try {
        const data = JSON.parse(content);
        if (Array.isArray(data)) {
          data.forEach((item: any) => {
            const key = item.isin || item.name;
            if (key && item.ticker) this.mappings.set(key, item.ticker);
          });
        } else {
          Object.entries(data).forEach(([key, value]) => {
            if (typeof value === 'string') this.mappings.set(key, value);
          });
        }
      } catch (e) {
        console.error(`Error parsing JSON ticker file: ${e}`);
      }
    } else if (ext === '.csv') {
      try {
        const results = Papa.parse(content, {
          header: true,
          skipEmptyLines: true,
        });
        (results.data as any[]).forEach((row) => {
          const key = row.isin || row.name || row.ISIN;
          const ticker = row.ticker || row.Ticker;
          if (key && ticker) this.mappings.set(key, ticker);
        });
      } catch (e) {
        console.error(`Error parsing CSV ticker file: ${e}`);
      }
    }
  }

  async resolve(isin: string, name: string): Promise<TickerResolution> {
    const ticker = this.mappings.get(isin) || this.mappings.get(name) || null;
    return { ticker };
  }
}
