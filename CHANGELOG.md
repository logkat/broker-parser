# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-01-11

### Added

- **Multi-Resolver Ticker Enrichment**: Implemented stacked resolver architecture allowing multiple ticker resolution strategies with fallback logic
- **Specialized Yahoo Finance Resolvers**:
  - `YahooISINResolver`: High-accuracy ISIN-based ticker resolution
  - `YahooNameResolver`: Advanced name-based search with Alphabet Inc Class A/C handling
  - `YahooFullResolver`: Combined resolver using both strategies
- **CLI Enhancements**:
  - `--yahoo-isin`: Enable ISIN-only resolution
  - `--yahoo-name`: Enable name-only resolution
  - `--no-yahoo`: Disable automatic Yahoo Finance resolution
  - Yahoo Finance resolution now enabled by default
- **Coding Guidelines**: Added `CODING_GUIDELINES.md` with strict terminology standards for `ticker`, `name`, and `symbol`
- **Comprehensive Test Suite**:
  - Added 50+ new tests across 5 new test files
  - `tests/cache.test.ts`: LocalFileTickerCache tests
  - `tests/enricher_advanced.test.ts`: Multi-resolver stacking and edge cases
  - `tests/file_resolver_extended.test.ts`: All file format variations
  - `tests/resolvers/yahoo.test.ts`: Complete Yahoo resolver coverage
  - Achieved 95%+ code coverage on resolvers and enrichment logic
- **CI/CD Enhancements**:
  - Added Prettier formatting check to CI pipeline
  - Reorganized CI steps for fail-fast approach (format → type-check → lint → build → test)
  - All quality gates now enforced automatically on every PR and push

### Changed

- **BREAKING**: Renamed `symbol` field to `name` in `ParsedTransaction` type to clearly distinguish company names from ticker symbols
- **BREAKING**: `enrichTransactions` now accepts `resolvers: TickerResolver[]` (array) instead of `resolver: TickerResolver` (singular)
- Refactored `TickerResolver` interface to require `name` property for better logging and identification
- Updated all parsers (Avanza, Nordnet) to use `name` field instead of `symbol`
- Enhanced Yahoo Finance integration with proper TypeScript types, eliminating all `any` usages
- Improved currency enrichment with fallback chain: `quote()` → `quoteSummary()`
- Updated documentation with resolver stacking examples and terminology reference

### Fixed

- Fixed documentation example showing incorrect `resolver` usage (now correctly uses `resolvers` array)
- Removed backward compatibility for deprecated `symbol` field in `FileTickerResolver`
- Fixed all ESLint warnings by adding proper TypeScript types throughout codebase

### Removed

- Removed `eslint.config copy.mjs` (leftover file with Next.js-specific config)
- Removed backward compatibility for `symbol` field in ticker mapping files (JSON/CSV)

### Documentation

- Updated README with comprehensive examples for:
  - Multi-resolver stacking
  - All supported ticker mapping formats (JSON object/array, CSV)
  - CLI usage with new resolver options
- Added terminology standards section linking to `CODING_GUIDELINES.md`
- Clarified distinction between `name` (company name) and `ticker` (stock symbol)

### Technical Improvements

- All 84 tests passing with zero linting warnings
- 100% function coverage across all modules
- Type-safe Yahoo Finance API integration
- Proper error handling in all resolvers
- Exchange filtering (NMS, NYQ, NGM) for higher quality ticker matches

## [0.0.1] - 2024-01-11

### Added

- Initial release of `@logkat/broker-parser`.
- Support for parsing Avanza CSV exports.
- Support for parsing Nordnet CSV exports.
- Core transaction normalization logic.
