import { describe, it, expect } from 'vitest';
import { parseTransaction, getParsers, identifyAccounts } from '../src/index';

describe('Broker Parsers', () => {
    describe('Avanza Parser', () => {
        it('should parse a buy transaction', () => {
            const row={
                Datum: '2025-12-26',
                Konto: 'Pension',
                'Typ av transaktion': 'Köp',
                'Värdepapper/beskrivning': 'Meta Platforms A',
                Antal: '1',
                Kurs: '666,89',
                Belopp: '-6129,85',
                Transaktionsvaluta: 'SEK',
                Courtage: '15,31',
                Valutakurs: '9,168745',
                Instrumentvaluta: 'USD',
                ISIN: 'US30303M1027',
            };

            const result=parseTransaction(row, 'Avanza');

            expect(result).not.toBeNull();
            expect(result?.symbol).toBe('Meta Platforms A');
            expect(result?.type).toBe('BUY');
            expect(result?.quantity).toBe(1);
            expect(result?.price).toBe(666.89);
            expect(result?.total).toBe(-6129.85);
            expect(result?.fee).toBe(15.31);
            expect(result?.currency).toBe('SEK'); // Account currency
            expect(result?.nativeCurrency).toBe('USD');
            expect(result?.exchangeRate).toBe(9.168745);
        });

        it('should parse a dividend', () => {
            const row={
                Datum: '2025-12-29',
                'Typ av transaktion': 'Utdelning',
                'Värdepapper/beskrivning': 'Meta Platforms A',
                Antal: '10',
                Kurs: '0,525',
                Belopp: '48,1',
                Transaktionsvaluta: 'SEK',
                Instrumentvaluta: 'USD',
            };

            const result=parseTransaction(row, 'Avanza');
            expect(result?.type).toBe('DIVIDEND');
            expect(result?.total).toBe(48.1);
        });

        it('should parse a sell transaction with negative quantity', () => {
            const row={
                Datum: '2025-12-30',
                'Typ av transaktion': 'Sälj',
                'Värdepapper/beskrivning': 'Meta Platforms A',
                Antal: '-5',
                Kurs: '700',
                Belopp: '35000',
                Transaktionsvaluta: 'SEK',
                Courtage: '15',
                Valutakurs: '10',
            };

            const result=parseTransaction(row, 'Avanza');
            expect(result?.type).toBe('SELL');
            expect(result?.quantity).toBe(5); // Absolute value
        });

        it('should parse a "Byte" transaction correctly', () => {
            const rowIn={
                Datum: '2023-03-10',
                Konto: 'Pension',
                'Typ av transaktion': 'Byte',
                'Värdepapper/beskrivning': 'DNB Fund Technology A SEK Acc',
                Antal: '0,1649',
                ISIN: 'LU2553959045',
            };

            const rowOut={
                Datum: '2023-03-10',
                Konto: 'Pension',
                'Typ av transaktion': 'Byte',
                'Värdepapper/beskrivning': 'DNB TECHNOLOGY',
                Antal: '-0,1649', // Negative means OUT
                ISIN: 'LU0302296495',
            };

            const resultIn=parseTransaction(rowIn, 'Avanza');
            const resultOut=parseTransaction(rowOut, 'Avanza');

            // "Byte" In (positive quantity) should act as BUY
            expect(resultIn?.type).toBe('BUY');
            expect(resultIn?.quantity).toBe(0.1649);

            // "Byte" Out (negative quantity) should act as SELL
            expect(resultOut?.type).toBe('SELL');
            expect(resultOut?.quantity).toBe(0.1649);
        });
    });

    describe('Avanza Legacy Parser', () => {
        it('should parse legacy format with Värdepapper header', () => {
            const row={
                Datum: '2023-01-01',
                'Typ av transaktion': 'Köp',
                'Värdepapper': 'Legacy Stock', // Old header
                Antal: '1',
                text: 'Some text',
            };
            const result=parseTransaction(row, 'Avanza');
            expect(result?.symbol).toBe('Legacy Stock');
        });
    });

    describe('Nordnet Parser', () => {
        // ... existing Nordnet tests ...
        // Add legacy too inside the describe block
        it('should parse legacy format with Värdepapper/Courtage', () => {
            const row={
                Bokföringsdag: '2023-01-01',
                Transaktionstyp: 'KÖPT',
                Värdepapper: 'Legacy Nordnet', // Old header
                Courtage: '10', // Instead of Total Avgift
                Transaktionsdag: '2023-01-01', // Explicit date
            };
            const result=parseTransaction(row, 'Nordnet');
            expect(result?.symbol).toBe('Legacy Nordnet');
            expect(result?.fee).toBe(10);
        });

        // Mocking the row structure based on my analysis of Nordnet CSV
        // Note: PapaParse handles duplicate headers by appending _1, _2 etc.
        // I need to simulate what PapaParse produces.
        // ... Total Avgift | Valuta | Belopp | Valuta | Inköpsvärde | Valuta ...
        // -> 'Total Avgift', 'Valuta', 'Belopp', 'Valuta_1', 'Inköpsvärde', 'Valuta_2'

        it('should parse a buy transaction', () => {
            const row={
                Bokföringsdag: '2025-12-04',
                Transaktionstyp: 'KÖPT',
                Instrument: 'Netflix',
                Antal: '50',
                Kurs: '102,98', // USD price
                'Total Avgift': '121,43',
                Valuta: 'SEK', // Fee currency
                Belopp: '-48694,8',
                Valuta_1: 'SEK', // Account currency (Belopp currency)
                Inköpsvärde: '5161,87',
                Valuta_2: 'USD', // Native currency
                Växlingskurs: '9,4335',
                ISIN: 'US64110L1061',
            };

            const result=parseTransaction(row, 'Nordnet');

            expect(result).not.toBeNull();
            expect(result?.symbol).toBe('Netflix');
            expect(result?.type).toBe('BUY');
            expect(result?.quantity).toBe(50);
            expect(result?.price).toBe(102.98); // Native price
            expect(result?.total).toBe(-48694.8); // Total in account currency
            expect(result?.currency).toBe('SEK'); // Account currency
            expect(result?.nativeCurrency).toBe('USD');
            expect(result?.exchangeRate).toBe(9.4335);
        });

        it('should parse a sell transaction with negative quantity', () => {
            const row={
                Bokföringsdag: '2025-12-05',
                Transaktionstyp: 'SÅLT',
                Instrument: 'Netflix',
                Antal: '-10',
                Kurs: '105',
                Belopp: '10000',
                Valuta: 'SEK',
            };

            const result=parseTransaction(row, 'Nordnet');
            expect(result?.type).toBe('SELL');
            expect(result?.quantity).toBe(10); // Absolute value
        });
    });

    describe('Auto Detection', () => {
        it('should detect Avanza', () => {
            const row={
                'Typ av transaktion': 'Köp',
                'Värdepapper/beskrivning': 'Test',
                Datum: '2023-01-01',
            };
            const result=parseTransaction(row, 'Auto');
            expect(result?.originalSource).toBe('Avanza');
        });

        it('should detect Nordnet', () => {
            const row={
                Transaktionstyp: 'KÖPT',
                Instrument: 'Test',
                Bokföringsdag: '2023-01-01',
            };
            const result=parseTransaction(row, 'Auto');
            expect(result?.originalSource).toBe('Nordnet');
        });

        it('should return null for unknown formats', () => {
            const row={ Unknown: 'Field' };
            const result=parseTransaction(row, 'Auto');
            expect(result).toBeNull();
        });
    });

    describe('Parser Utils', () => {
        it('should return all parsers', () => {
            const parsers=getParsers();
            expect(parsers).toHaveProperty('Avanza');
            expect(parsers).toHaveProperty('Nordnet');
        });

        it('should identify accounts', () => {
            const data=[
                {
                    'Typ av transaktion': 'Köp',
                    'Värdepapper/beskrivning': 'Test',
                    Datum: '2023-01-01',
                    Konto: 'Account1',
                },
                {
                    'Typ av transaktion': 'Köp',
                    'Värdepapper/beskrivning': 'Test',
                    Datum: '2023-01-02',
                    Konto: 'Account1',
                },
                {
                    'Typ av transaktion': 'Köp',
                    'Värdepapper/beskrivning': 'Test',
                    Datum: '2023-01-03',
                    Konto: 'Account2',
                },
            ];
            const accounts=identifyAccounts(data);
            expect(accounts).toHaveLength(2);
            expect(accounts.find((a) => a.id==='Account1')?.count).toBe(2);
            expect(accounts.find((a) => a.id==='Account2')?.count).toBe(1);
        });
    });
});
