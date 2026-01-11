import { describe, it, expect, afterEach } from 'vitest';
import { LocalFileTickerCache } from '../src/cache';
import fs from 'fs';
import path from 'path';

describe('LocalFileTickerCache', () => {
  const tempCachePath=path.join(__dirname, 'temp_cache.json');

  afterEach(() => {
    if (fs.existsSync(tempCachePath)) {
      fs.unlinkSync(tempCachePath);
    }
  });

  it('should create cache file if it does not exist', async () => {
    const cache=new LocalFileTickerCache(tempCachePath);
    await cache.set('US0378331005', { ticker: 'AAPL', currency: 'USD' });
    cache.flush(); // Ensure file is written

    expect(fs.existsSync(tempCachePath)).toBe(true);
  });

  it('should store and retrieve ticker resolutions', async () => {
    const cache=new LocalFileTickerCache(tempCachePath);

    await cache.set('US0378331005', { ticker: 'AAPL', currency: 'USD' });
    const result=await cache.get('US0378331005');

    expect(result).toEqual({ ticker: 'AAPL', currency: 'USD' });
  });

  it('should return undefined for non-existent keys', async () => {
    const cache=new LocalFileTickerCache(tempCachePath);
    const result=await cache.get('NONEXISTENT');

    expect(result).toBeUndefined();
  });

  it('should persist data across instances', async () => {
    const cache1=new LocalFileTickerCache(tempCachePath);
    await cache1.set('US0378331005', { ticker: 'AAPL', currency: 'USD' });
    cache1.flush(); // Ensure data is written to disk

    const cache2=new LocalFileTickerCache(tempCachePath);
    const result=await cache2.get('US0378331005');

    expect(result).toEqual({ ticker: 'AAPL', currency: 'USD' });
  });

  it('should handle multiple entries', async () => {
    const cache=new LocalFileTickerCache(tempCachePath);

    await cache.set('US0378331005', { ticker: 'AAPL', currency: 'USD' });
    await cache.set('US30303M1027', { ticker: 'META', currency: 'USD' });
    await cache.set('US64110L1061', { ticker: 'NFLX', currency: 'USD' });

    expect(await cache.get('US0378331005')).toEqual({
      ticker: 'AAPL',
      currency: 'USD',
    });
    expect(await cache.get('US30303M1027')).toEqual({
      ticker: 'META',
      currency: 'USD',
    });
    expect(await cache.get('US64110L1061')).toEqual({
      ticker: 'NFLX',
      currency: 'USD',
    });
  });

  it('should overwrite existing entries', async () => {
    const cache=new LocalFileTickerCache(tempCachePath);

    await cache.set('US0378331005', { ticker: 'AAPL', currency: 'USD' });
    await cache.set('US0378331005', { ticker: 'AAPL', currency: 'EUR' });

    const result=await cache.get('US0378331005');
    expect(result?.currency).toBe('EUR');
  });

  it('should handle empty cache file gracefully', async () => {
    fs.writeFileSync(tempCachePath, '{}');
    const cache=new LocalFileTickerCache(tempCachePath);

    const result=await cache.get('US0378331005');
    expect(result).toBeUndefined();
  });

  it('should handle corrupted cache file gracefully', async () => {
    fs.writeFileSync(tempCachePath, 'invalid json');
    const cache=new LocalFileTickerCache(tempCachePath);

    await cache.set('US0378331005', { ticker: 'AAPL', currency: 'USD' });
    const result=await cache.get('US0378331005');

    expect(result).toEqual({ ticker: 'AAPL', currency: 'USD' });
  });
});
