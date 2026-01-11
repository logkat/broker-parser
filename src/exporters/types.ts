import { ParsedTransaction } from '../parsers/types';

export interface ExportResult {
    filename: string;
    content: string; // CSV content or JSON string
    mimeType: string;
}

export interface PortfolioExporter {
    name: string;
    export(transactions: ParsedTransaction[]): ExportResult;
}
