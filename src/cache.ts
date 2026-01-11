import fs from 'fs';
import { TickerCache, TickerResolution } from './enricher';

export class LocalFileTickerCache implements TickerCache {
  private cache: Record<string, TickerResolution> = {};
  private filePath: string;
  private dirty = false;
  private saveTimer: NodeJS.Timeout | null = null;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.load();

    // Ensure cache is saved on process exit
    process.on('beforeExit', () => {
      this.flush();
    });
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

  private scheduleSave() {
    // Debounce saves: only write to disk after 1 second of no new writes
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    this.saveTimer = setTimeout(() => {
      this.flush();
    }, 1000);
  }

  /**
   * Immediately flush the cache to disk
   */
  flush() {
    if (!this.dirty) return;

    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.cache, null, 2));
      this.dirty = false;
      if (this.saveTimer) {
        clearTimeout(this.saveTimer);
        this.saveTimer = null;
      }
    } catch (e) {
      console.warn(`Failed to save ticker cache to ${this.filePath}`);
    }
  }

  async get(key: string): Promise<TickerResolution | undefined> {
    return this.cache[key];
  }

  async set(key: string, value: TickerResolution): Promise<void> {
    this.cache[key] = value;
    this.dirty = true;
    this.scheduleSave();
  }
}
