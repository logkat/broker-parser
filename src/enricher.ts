import { ParsedTransaction } from './parsers/types';

export type TickerResolver=(isin: string, symbol: string) => Promise<string|null>;

/**
 * Enriches transactions by resolving tickers using a provided resolver function.
 * This allows the library to remain dependency-free while enabling data enrichment.
 */
export async function enrichTransactions(
    transactions: ParsedTransaction[],
    resolver: TickerResolver
): Promise<ParsedTransaction[]> {
    const enriched: ParsedTransaction[]=[];

    // Cache resolutions to avoid redundant calls for the same ISIN
    const cache=new Map<string, string|null>();

    for (const t of transactions) {
        // If already has ticker, skip
        if (t.ticker) {
            enriched.push(t);
            continue;
        }

        const key=t.isin||t.symbol;
        if (!key) {
            enriched.push(t);
            continue;
        }

        let ticker: string|null=null;

        if (cache.has(key)) {
            ticker=cache.get(key)||null;
        } else {
            try {
                ticker=await resolver(t.isin||'', t.symbol);
                cache.set(key, ticker);
            } catch (e) {
                console.warn(`Failed to resolve ticker for ${key}`, e);
            }
        }

        enriched.push({
            ...t,
            ticker: ticker||undefined,
        });
    }

    return enriched;
}
