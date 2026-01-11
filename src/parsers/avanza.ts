import { BrokerParser } from './types';
import { parseNumber, normalizeType } from './utils';

export const AvanzaParser: BrokerParser = {
  name: 'Avanza',
  canParse: (row) =>
    !!(
      row['Typ av transaktion'] &&
      (row['Värdepapper/beskrivning'] || row['Värdepapper'])
    ),
  parse: (row) => {
    const qty = parseNumber(row['Antal']);
    const total = parseNumber(row['Belopp']);
    const fee = parseNumber(row['Courtage']);
    const price = parseNumber(row['Kurs']);
    const date = new Date(row['Datum']);

    let type = normalizeType(row['Typ av transaktion']);
    const rawType = (row['Typ av transaktion'] || '').trim();

    // Special handling for "Byte" (Exchange/Switch) which normalizes to OTHER
    // We use the sign of Quantity to determine direction
    if (rawType.toLowerCase() === 'byte') {
      if (qty > 0) type = 'BUY';
      else if (qty < 0) type = 'SELL';
    }

    // Find ISIN key case-insensitively
    const isinKey = Object.keys(row).find(
      (k) => k.trim().toUpperCase() === 'ISIN'
    );
    const isin = isinKey ? row[isinKey] : undefined;

    // Avanza specific: "Transaktionsvaluta" is account currency usually (SEK)
    // "Instrumentvaluta" is the asset currency
    const accountCurrency = row['Transaktionsvaluta'] || 'SEK';
    const nativeCurrency = row['Instrumentvaluta'] || accountCurrency;

    let exchangeRate = parseNumber(row['Valutakurs']);
    if (exchangeRate === 0 && accountCurrency === nativeCurrency) {
      exchangeRate = 1;
    }

    return {
      date,
      type,
      symbol: row['Värdepapper/beskrivning'] || row['Värdepapper'],
      quantity: Math.abs(qty),
      price: price,
      currency: accountCurrency,
      fee,
      total,
      originalSource: 'Avanza',
      accountId: row['Konto'],
      accountCurrency,
      priceInAccountCurrency:
        qty !== 0 && total !== 0 ? Math.abs(total / qty) : price, // Approximate if total is available including fees
      nativePrice: price,
      nativeCurrency,
      isin,
      exchangeRate,
    };
  },
};
