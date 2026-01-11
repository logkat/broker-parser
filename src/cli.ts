#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { parseTransaction, YahooFinanceExporter } from './index';
import { BrokerFormat } from './parsers/types';

const program=new Command();

program
    .name('broker-parser')
    .description('Parse broker transaction CSVs and export to other formats')
    .version('0.0.1');

program
    .command('export')
    .description('Export broker CSV to another format')
    .argument('<file>', 'Path to the broker CSV file')
    .option('-f, --format <format>', 'Broker format (Auto, Avanza, Nordnet)', 'Auto')
    .option('-e, --exporter <exporter>', 'Exporter to use (yahoo)', 'yahoo')
    .option('-o, --output <path>', 'Output file path')
    .action((file, options) => {
        const filePath=path.resolve(file);
        if (!fs.existsSync(filePath)) {
            console.error(`Error: File not found at ${filePath}`);
            process.exit(1);
        }

        const csvData=fs.readFileSync(filePath, 'utf8');
        const parsedCsv=Papa.parse(csvData, {
            header: true,
            skipEmptyLines: true,
        });

        if (parsedCsv.errors.length>0) {
            console.warn('Warning: Some errors occurred during CSV parsing:');
            console.warn(parsedCsv.errors);
        }

        const data=parsedCsv.data as Record<string, string>[];
        const transactions=data
            .map((row) => parseTransaction(row, options.format as BrokerFormat))
            .filter((t): t is any => t!==null);

        if (transactions.length===0) {
            console.error('Error: No transactions could be parsed from the file.');
            process.exit(1);
        }

        console.log(`Successfully parsed ${transactions.length} transactions.`);

        let result;
        if (options.exporter==='yahoo') {
            result=YahooFinanceExporter.export(transactions);
        } else {
            console.error(`Error: Unknown exporter "${options.exporter}"`);
            process.exit(1);
        }

        const outputPath=options.output||path.resolve(result.filename);
        fs.writeFileSync(outputPath, result.content);
        console.log(`Success! Exported to ${outputPath}`);
    });

program.parse();
