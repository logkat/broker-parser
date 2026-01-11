# Broker Parser

A robust, standalone TypeScript library for parsing transaction CSV exports from various stock brokers. This library normalizes transaction data into a common format, handling currency conversions, transaction types, and ISIN extraction.

## Features

- **Multi-Broker Support**: Automatically detects and parses CSVs from supported brokers.
- **Normalization**: Unifies transaction types (BUY, SELL, DIVIDEND, etc.) across brokers.
- **Currency Handling**: Extracts account currency, native currency, and exchange rates.
- **ISIN Extraction**: Reliably finds ISIN codes for accurate instrument identification.
- **Export Support**: Convert parsed transactions into formats like Yahoo Finance CSV.
- **CLI Support**: Command-line interface for bulk processing and exporting without writing code.
- **Data Enrichment**: Helper utilities to resolve Tickers (e.g. from ISIN) before export.
- **Type Safe**: Written in TypeScript with full type definitions.

## Supported Brokers

- **Avanza** (Sweden)
- **Nordnet** (Sweden/Nordics)
- _(More can be added by implementing the `BrokerParser` interface)_

## Installation

### Library Usage

To install from GitHub Packages, you need to configure your `.npmrc` file:

```bash
echo "@logkat:registry=https://npm.pkg.github.com" >> .npmrc
```

Then install the package:

```bash
npm install @logkat/broker-parser
# or
pnpm add @logkat/broker-parser
```

### CLI Usage

The library provides a powerful CLI for bulk processing and ticker resolution.

```bash
# Basic export (defaults to Yahoo resolution)
broker-parser export input.csv -o output.csv

# Specific resolvers (stacked in order)
broker-parser export input.csv --ticker-file custom.json --yahoo

# Control over resolution strategies
broker-parser export input.csv --yahoo-isin --yahoo-name
```

| Flag             | Description                                              |
| ---------------- | -------------------------------------------------------- |
| `--yahoo`        | Use both ISIN and Name search (Default: true)            |
| `--yahoo-isin`   | Trigger only ISIN-based search                           |
| `--yahoo-name`   | Trigger only Name-based search (fuzzy matching)          |
| `--ticker-file`  | Use a local JSON/CSV mapping file (priority)             |
| `--no-yahoo`     | Disable all automatic lookups                            |
| `--cache <path>` | Path to resolution cache (Default: `.ticker-cache.json`) |

## Usage

### Library Usage (TypeScript)

### Parsing transactions

```typescript
import { parseTransaction } from '@logkat/broker-parser';

const transaction = parseTransaction(row);
```

### Advanced Ticker Resolution

The library and CLI support "stacked" resolvers. You can prioritize local data and then fall back to various cloud providers.

```typescript
import {
  enrichTransactions,
  YahooISINResolver,
  YahooNameResolver,
  FileTickerResolver,
  LocalFileTickerCache,
} from '@logkat/broker-parser';

const enriched = await enrichTransactions(transactions, {
  resolvers: [
    new FileTickerResolver('./manual-mapping.json'),
    new YahooISINResolver(),
    new YahooNameResolver(),
  ],
  cache: new LocalFileTickerCache('./cache.json'),
});
```

### Auto-Detecting Broker Format

The library automatically detects the format based on unique headers (e.g., "Typ av transaktion" for Avanza vs "Transaktionstyp" for Nordnet). You can also force a format:

```typescript
// Force Avanza parser
const txn = parseTransaction(row, 'Avanza');
```

### Identifying Accounts

If you are parsing a large CSV with multiple accounts, you can extract unique account identifiers:

```typescript
import { identifyAccounts } from '@logkat/broker-parser';

const accounts = identifyAccounts(allRows);
// Returns: [{ id: '12345', name: 'My ISK', count: 50 }, ...]
```

### Exporting Data

You can export normalized transactions to various formats (e.g., for importing into other tools).

```typescript
import { YahooFinanceExporter } from '@logkat/broker-parser';

// Convert transactions to Yahoo Finance CSV
const result = YahooFinanceExporter.export(parsedTransactions);
console.log(result.content); // CSV string
```

### Enriching Data (Tickers)

Brokers outputs (Avanza/Nordnet) often lack the actual Ticker Symbol required by Yahoo Finance (they provide ISIN or Name instead).
To fix this, you can use `enrichTransactions` with a resolver.

```typescript
import {
  enrichTransactions,
  YahooFinanceExporter,
} from '@logkat/broker-parser';

// 1. Define or use a built-in resolver
const myResolver = {
  resolve: async (isin: string, symbol: string) => {
    if (isin === 'US0378331005') return { ticker: 'AAPL' };
    return { ticker: null };
  },
};

// 2. Enrich
const enriched = await enrichTransactions(parsedTransactions, {
  resolver: myResolver,
});

// 3. Export
const csv = YahooFinanceExporter.export(enriched);
```

#### Custom Caching

The library provides a `TickerCache` interface. You can implement your own (e.g., using Redis or a Database) to persist resolutions.

```typescript
interface TickerCache {
  get(key: string): Promise<TickerResolution | undefined>;
  set(key: string, value: TickerResolution): Promise<void>;
}
```

## API Reference

### `parseTransaction(row: Record<string, string>, format?: BrokerFormat): ParsedTransaction | null`

Parses a raw CSV row into a normalized transaction object. Returns `null` if the row cannot be parsed.

### `identifyAccounts(data: Record<string, string>[]): AccountSummary[]`

Scans a dataset to find all unique account IDs present in the file.

### `ParsedTransaction` Interface

- `date`: Date object
- `type`: 'BUY' | 'SELL' | 'DIVIDEND' | 'DEPOSIT' | 'WITHDRAW' | 'INTEREST' | 'TAX' | 'OTHER'
- `symbol`: string
- `quantity`: number
- `price`: number
- `total`: number
- `currency`: string (Account Currency)
- `nativeCurrency`: string (Asset Currency)
- `isin`: string (optional)
- ...and more.

## Migration Guide

If you are moving from an internal implementation to this library:

1.  **Replace Imports**:
    Change your imports from your local file:

    ```typescript
    - import { parseTransaction } from '@/lib/parser';
    + import { parseTransaction } from '@logkat/broker-parser';
    ```

2.  **Check Config**:
    Ensure your project handles the `ParsedTransaction` return type correctly, as some deprecated fields might have been cleaned up.

3.  **Dependencies**:
    This library has zero runtime dependencies (except standard JS/TS features).

## Adding a New Broker

We welcome contributions! To add support for a new broker:

1.  **Create a Parser File**:
    Create a new file (e.g., `src/parsers/mybroker.ts`) implementing the `BrokerParser` interface.

    ```typescript
    import { BrokerParser } from './types';
    import { parseNumber, normalizeType } from './utils';

    export const MyBrokerParser: BrokerParser = {
      name: 'MyBroker',
      canParse: (row) => !!(row['UniqueHeader'] && row['AnotherHeader']),
      parse: (row) => {
        // ... parsing logic mapping to ParsedTransaction
        return {
          date: new Date(row['Date']),
          type: normalizeType(row['Type']),
          // ...
        };
      },
    };
    ```

2.  **Register the Parser**:
    Import and add your parser to `src/index.ts` in the `getParsers()` function and update the `parseTransaction` logic if needed.

3.  **Add Tests**:
    Add a test case in `tests/parser_brokers.test.ts` with a sample transaction row to verify it parses correctly.

## Development & Testing

1.  **Install Dependencies**:
    ```bash
    pnpm install
    ```
2.  **Run Tests**:
    ```bash
    pnpm test
    ```
3.  **Build**:
    ```bash
    pnpm build
    ```

## License

MIT
