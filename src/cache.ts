import fs from 'fs';
import { TickerCache, TickerResolution } from './enricher';

export class LocalFileTickerCache implements TickerCache {
  private cache: Record<string, TickerResolution> = {};
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.load();
  }

  private load() {
    if (fs.existsSync(this.filePath)) {
      try {
        this.cache = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      } catch (e) {
        console.warn(`Failed to load ticker cache from ${this.filePath}`);
      }
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.cache, null, 2));
    } catch (e) {
      console.warn(`Failed to save ticker cache to ${this.filePath}`);
    }
  }

  async get(key: string): Promise<TickerResolution | undefined> {
    return this.cache[key];
  }

  async set(key: string, value: TickerResolution): Promise<void> {
    this.cache[key] = value;
    this.save();
  }
}
