# Coding Guidelines

## Terminology Standards

### Ticker vs Name vs Symbol

To maintain consistency across the codebase, always adhere to these naming conventions:

- **`ticker`**: Use this for stock ticker symbols (e.g., "AAPL", "META", "GOOGL")
  - Variable names: `ticker`, `resolvedTicker`, `stockTicker`
  - Field names: `ticker`
  - Function parameters: `ticker`

- **`name`**: Use this for company/security names (e.g., "Apple Inc", "Meta Platforms A")
  - Variable names: `name`, `companyName`, `securityName`
  - Field names: `name`
  - Function parameters: `name`

- **`symbol`**: **DEPRECATED** - Do not use this term for company names
  - If you encounter `symbol` in legacy code or external APIs, treat it as a `ticker`
  - When refactoring, always replace `symbol` with either `ticker` or `name` based on context
  - Exception: External API responses where `symbol` is the field name (cast/map to `ticker`)

### Examples

✅ **Correct:**

```typescript
interface Transaction {
  name: string; // "Apple Inc"
  ticker: string; // "AAPL"
  isin: string; // "US0378331005"
}

function resolveTicker(isin: string, name: string): string {
  // ...
}
```

❌ **Incorrect:**

```typescript
interface Transaction {
  symbol: string; // Ambiguous - is this a ticker or name?
}

function resolveSymbol(isin: string, symbol: string): string {
  // ...
}
```

### Rationale

The term "symbol" is ambiguous in financial contexts. It can refer to:

- A ticker symbol (AAPL)
- A company name (Apple Inc)
- A trading symbol on an exchange

By strictly using `ticker` for stock symbols and `name` for company names, we eliminate confusion and make the codebase more maintainable.
