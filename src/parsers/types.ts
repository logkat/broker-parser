export type ParsedTransaction={
    date: Date;
    type: string; // "BUY", "SELL"
    symbol: string;
    quantity: number;
    price: number;
    currency: string;
    fee: number;
    total: number;
    originalSource: string|null;
    ticker?: string|null;
    accountId?: string;
    accountType?: string;
    priceInAccountCurrency?: number;
    accountCurrency?: string;
    nativePrice?: number;
    nativeCurrency?: string;
    isin?: string;
    exchangeRate?: number;
};

export type BrokerFormat='Avanza'|'Nordnet'|'Auto'|(string&{});

export interface BrokerParser {
    name: string;
    canParse(row: Record<string, string>): boolean;
    parse(row: Record<string, string>): ParsedTransaction|null;
}
