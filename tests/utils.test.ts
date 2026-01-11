import { describe, it, expect } from 'vitest';
import { parseNumber, normalizeType } from '../src/index';

describe('Parser Utils', () => {
    describe('parseNumber', () => {
        it('should handle numbers', () => {
            expect(parseNumber(123.45)).toBe(123.45);
        });

        it('should handle strings with Swedish formatting', () => {
            expect(parseNumber('1 234,50')).toBe(1234.5);
            expect(parseNumber('10,5')).toBe(10.5);
        });

        it('should handle empty/null values', () => {
            expect(parseNumber(null)).toBe(0);
            expect(parseNumber(undefined)).toBe(0);
            expect(parseNumber('')).toBe(0);
        });
    });

    describe('normalizeType', () => {
        it('should normalize buy types', () => {
            expect(normalizeType('KÖP')).toBe('BUY');
            expect(normalizeType('KÖPT')).toBe('BUY');
            expect(normalizeType('buy')).toBe('BUY');
        });

        it('should normalize sell types', () => {
            expect(normalizeType('SÄLJ')).toBe('SELL');
            expect(normalizeType('SÅLT')).toBe('SELL');
            expect(normalizeType('Sell')).toBe('SELL');
        });

        it('should normalize dividend types', () => {
            expect(normalizeType('UTDELNING')).toBe('DIVIDEND');
            expect(normalizeType('Dividend')).toBe('DIVIDEND');
        });

        it('should normalize deposit types', () => {
            expect(normalizeType('INSÄTTNING')).toBe('DEPOSIT');
            expect(normalizeType('DEPOSIT')).toBe('DEPOSIT');
            expect(normalizeType('INS. KREDIT')).toBe('DEPOSIT');
            expect(normalizeType('REALTIDSINSÄTTNING')).toBe('DEPOSIT');
        });

        it('should normalize withdraw types', () => {
            expect(normalizeType('UTTAG')).toBe('WITHDRAW');
            expect(normalizeType('Withdraw')).toBe('WITHDRAW');
        });

        it('should normalize interest types', () => {
            expect(normalizeType('RÄNTA')).toBe('INTEREST');
            expect(normalizeType('Interest')).toBe('INTEREST');
            expect(normalizeType('AVKASTNINGSSKATT')).toBe('INTEREST');
        });

        it('should normalize tax types', () => {
            expect(normalizeType('SKATT')).toBe('TAX');
            expect(normalizeType('Tax')).toBe('TAX');
        });

        it('should handle unknown types', () => {
            expect(normalizeType('UNKNOWN')).toBe('OTHER');
            expect(normalizeType('')).toBe('OTHER');
            expect(normalizeType(null as unknown as string)).toBe('OTHER');
        });
    });
});
