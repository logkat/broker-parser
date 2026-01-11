#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import {
  parseTransaction,
  YahooFinanceExporter,
  enrichTransactions,
  YahooISINResolver,
  YahooNameResolver,
  FileTickerResolver,
  LocalFileTickerCache,
} from './index';
import { BrokerFormat } from './parsers/types';

const program = new Command();

program
  .name('broker-parser')
  .description('Parse broker transaction CSVs and export to other formats')
  .version('0.0.1');

program
  .command('export')
  .description('Export broker CSV to another format')
  .argument('<file>', 'Path to the broker CSV file')
  .option(
    '-f, --format <format>',
    'Broker format (Auto, Avanza, Nordnet)',
    'Auto'
  )
  .option('-e, --exporter <exporter>', 'Exporter to use (yahoo)', 'yahoo')
  .option('-o, --output <path>', 'Output file path')
  .option(
    '--yahoo',
    'Use Yahoo Finance (ISIN + Name) for ticker resolution (default)',
    true
  )
  .option('--yahoo-isin', 'Use Yahoo Finance ISIN search', false)
  .option('--yahoo-name', 'Use Yahoo Finance name search', false)
  .option(
    '--ticker-file <path>',
    'Path to a JSON or CSV file for ticker resolution'
  )
  .option(
    '--cache <path>',
    'Path to a local JSON file for caching ticker resolutions',
    '.ticker-cache.json'
  )
  .option('--no-yahoo', 'Disable automatic Yahoo Finance resolution')
  .option('--no-cache', 'Disable caching')
  .action(async (file, options) => {
    const filePath = path.resolve(file);
    if (!fs.existsSync(filePath)) {
      console.error(`Error: File not found at ${filePath}`);
      process.exit(1);
    }

    const csvData = fs.readFileSync(filePath, 'utf8');
    const parsedCsv = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsedCsv.errors.length > 0) {
      console.warn('Warning: Some errors occurred during CSV parsing:');
      console.warn(parsedCsv.errors);
    }

    const data = parsedCsv.data as Record<string, string>[];
    const transactions = data
      .map((row) => parseTransaction(row, options.format as BrokerFormat))
      .filter((t): t is any => t !== null);

    if (transactions.length === 0) {
      console.error('Error: No transactions could be parsed from the file.');
      process.exit(1);
    }

    console.log(`Successfully parsed ${transactions.length} transactions.`);

    let processedTransactions = transactions;

    // resolver stacking
    const resolvers = [];

    // 1. File Resolver (Highest priority if provided)
    if (options.tickerFile) {
      resolvers.push(new FileTickerResolver(path.resolve(options.tickerFile)));
    }

    // 2. Yahoo ISIN Resolver (High accuracy)
    if (options.yahoo !== false || options.yahooIsin) {
      resolvers.push(new YahooISINResolver());
    }

    // 3. Yahoo Name Resolver (Fallback)
    if (options.yahoo !== false || options.yahooName) {
      resolvers.push(new YahooNameResolver());
    }

    if (resolvers.length > 0) {
      console.log(
        `Resolving tickers using: ${resolvers.map((r) => r.name).join(', ')}...`
      );

      let cache;
      if (options.cache !== false) {
        cache = new LocalFileTickerCache(path.resolve(options.cache));
      }

      processedTransactions = await enrichTransactions(transactions, {
        resolvers,
        cache,
      });

      const resolvedCount = processedTransactions.filter(
        (t) => t.ticker
      ).length;
      console.log(
        `Resolved tickers for ${resolvedCount}/${processedTransactions.length} transactions.`
      );
    }

    let result;
    if (options.exporter === 'yahoo') {
      result = YahooFinanceExporter.export(processedTransactions);
    } else {
      console.error(`Error: Unknown exporter "${options.exporter}"`);
      process.exit(1);
    }

    const outputPath = options.output || path.resolve(result.filename);
    fs.writeFileSync(outputPath, result.content);
    console.log(`Success! Exported to ${outputPath}`);
  });

program.parse();
