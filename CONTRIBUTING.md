# Contributing to Broker Parser

First off, thanks for taking the time to contribute! 🎉

The following is a set of guidelines for contributing to `@logkat/broker-parser`. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## Code of Conduct

This project and everyone participating in it is governed by the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

- **Ensure the bug was not already reported** by searching on GitHub under [Issues](https://github.com/logkat/broker-parser/issues).
- If you're unable to find an open issue addressing the problem, [open a new one](https://github.com/logkat/broker-parser/issues/new). Be sure to include a **title and clear description**, as well as as much relevant information as possible.

### Suggesting Enhancements

- Open a new issue and clearly describe your suggestion.
- Explain why this enhancement would be useful to most users.

### Adding a New Broker

We love support for new brokers! To add one:

1.  **Create a Parser File**:
    Create a new file in `src/parsers/` (e.g., `src/parsers/mybroker.ts`) implementing the `BrokerParser` interface.

2.  ** Implement Logic**:
    - `name`: Unique name of the broker.
    - `canParse(row)`: A function returning `true` if this row belongs to this broker. Be specific (check unique headers).
    - `parse(row)`: Map the CSV row to the `ParsedTransaction` interface.

3.  **Register**:
    Add your parser to the registry in `src/parsers/index.ts` (or wherever `getParsers` is defined).

4.  **Test**:
    Add a test case in `tests/parser_brokers.test.ts` with a sample transaction row.

### Pull Requests

1.  Fork the repo and create your branch from `main`.
2.  If you've added code that should be tested, add tests.
3.  Ensure the test suite passes (`pnpm test`).
4.  Make sure your code lints (`pnpm run type-check`).
5.  Issue that pull request!

## Styleguides

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature").
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...").
- Limit the first line to 72 characters or less.
