import { ParsedTransaction, BrokerParser, BrokerFormat } from './parsers/types';
import { AvanzaParser } from './parsers/avanza';
import { NordnetParser } from './parsers/nordnet';
import { parseNumber, normalizeType } from './parsers/utils';

// Re-export types and utils for consumers
export type { ParsedTransaction, BrokerParser, BrokerFormat };
export { parseNumber, normalizeType };

import { YahooFinanceExporter } from './exporters/yahoo';
export * from './exporters/types';
export { YahooFinanceExporter };

export function getParsers(): Record<string, BrokerParser> {
    return {
        Avanza: AvanzaParser,
        Nordnet: NordnetParser,
    };
}

export function parseTransaction(
    row: Record<string, string>,
    format: BrokerFormat='Auto'
): ParsedTransaction|null {
    let parser: BrokerParser|undefined;

    const parsers=getParsers();

    if (format==='Auto') {
        // Find first parser that can parse the row
        const found=Object.values(parsers).find(p => p.canParse(row));
        if (found) parser=found;
    } else {
        // Direct lookup
        parser=parsers[format];
    }

    if (parser&&parser.canParse(row)) {
        const t=parser.parse(row);
        if (t&&t.symbol&&t.date&&!isNaN(t.date.getTime())) {
            return t;
        }
    }

    // Fallback / legacy check if Auto failed or specific parser failed (though unlikely if canParse checks keys)
    if (format==='Auto'&&!parser) {
        // Try generic best effort if any new formats appear, but for now return null
    }

    return null;
}

export function identifyAccounts(
    data: Record<string, string>[]
): { id: string; name: string; count: number }[] {
    const accounts=new Map<
        string,
        { id: string; name: string; count: number }
    >();

    data.forEach((row) => {
        const t=parseTransaction(row);
        if (t&&t.accountId) {
            const existing=accounts.get(t.accountId);
            if (existing) {
                existing.count++;
            } else {
                accounts.set(t.accountId, {
                    id: t.accountId,
                    name: t.accountId,
                    count: 1,
                });
            }
        }
    });

    return Array.from(accounts.values());
}
