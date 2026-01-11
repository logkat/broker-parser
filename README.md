# Broker Parser

A robust, standalone TypeScript library for parsing transaction CSV exports from various stock brokers. This library normalizes transaction data into a common format, handling currency conversions, transaction types, and ISIN extraction.

## Features

- **Multi-Broker Support**: Automatically detects and parses CSVs from supported brokers.
- **Normalization**: Unifies transaction types (BUY, SELL, DIVIDEND, etc.) across brokers.
- **Currency Handling**: Extracts account currency, native currency, and exchange rates.
- **ISIN Extraction**: Reliably finds ISIN codes for accurate instrument identification.
- **Type Safe**: Written in TypeScript with full type definitions.

## Supported Brokers

- **Avanza** (Sweden)
- **Nordnet** (Sweden/Nordics)
- _(More can be added by implementing the `BrokerParser` interface)_

## Installation

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

## Usage

### Parsing a Single Transaction

```typescript
import { parseTransaction } from "@logkat/broker-parser";

const row = {
  "Typ av transaktion": "Köp",
  "Värdepapper/beskrivning": "Apple Inc",
  Antal: "10",
  Kurs: "150",
  Belopp: "-1500",
  Transaktionsvaluta: "USD",
  // ... other broker specific fields
};

const transaction = parseTransaction(row);

if (transaction) {
  console.log(transaction.type); // 'BUY'
  console.log(transaction.quantity); // 10
  console.log(transaction.symbol); // 'Apple Inc'
}
```

### Auto-Detecting Broker Format

The library automatically detects the format based on unique headers (e.g., "Typ av transaktion" for Avanza vs "Transaktionstyp" for Nordnet). You can also force a format:

```typescript
// Force Avanza parser
const txn = parseTransaction(row, "Avanza");
```

### Identifying Accounts

If you are parsing a large CSV with multiple accounts, you can extract unique account identifiers:

```typescript
import { identifyAccounts } from "@logkat/broker-parser";

const accounts = identifyAccounts(allRows);
// Returns: [{ id: '12345', name: 'My ISK', count: 50 }, ...]
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
    import { BrokerParser } from "./types";
    import { parseNumber, normalizeType } from "./utils";

    export const MyBrokerParser: BrokerParser = {
      name: "MyBroker",
      canParse: (row) => !!(row["UniqueHeader"] && row["AnotherHeader"]),
      parse: (row) => {
        // ... parsing logic mapping to ParsedTransaction
        return {
          date: new Date(row["Date"]),
          type: normalizeType(row["Type"]),
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
