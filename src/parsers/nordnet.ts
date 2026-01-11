import { BrokerParser } from './types';
import { parseNumber, normalizeType } from './utils';

export const NordnetParser: BrokerParser = {
  name: 'Nordnet',
  canParse: (row) =>
    !!(
      row['Transaktionstyp'] &&
      (row['Instrument'] || row['Värdepapper']) &&
      row['Bokföringsdag']
    ),
  parse: (row) => {
    const qty = parseNumber(row['Antal']);
    const total = parseNumber(row['Belopp']);
    const fee = parseNumber(row['Total Avgift'] || row['Courtage']); // Check both potential headers if they vary
    const price = parseNumber(row['Kurs']);
    const date = new Date(row['Transaktionsdag'] || row['Bokföringsdag']);
    const type = normalizeType(row['Transaktionstyp']);
    const isin = row['ISIN'];
    const exchangeRate = parseNumber(row['Växlingskurs']);

    // Handle Nordnet's multiple Valuta columns
    // Usually:
    // Valuta (0) -> Fee check?
    // Belopp -> Valuta (or Valuta_1) -> Account Currency
    // Inköpsvärde -> Valuta (or Valuta_2) -> Native Currency

    const accountCurrency = row['Valuta_1'] || row['Valuta'] || 'SEK'; // Fallback to first if only one
    const nativeCurrency = row['Valuta_2'] || row['Valuta'] || 'SEK';

    // In Nordnet export:
    // 'Belopp' is valid for BUY/SELL/DIVIDEND

    return {
      date,
      type,
      symbol: row['Instrument'] || row['Värdepapper'],
      quantity: Math.abs(qty),
      price: price, // This is usually native price
      currency: accountCurrency,
      fee,
      total,
      originalSource: 'Nordnet',
      accountId: row['Depå'] || row['Konto'] || row['Kontonummer'], // 'Depå' in the file
      accountCurrency,
      priceInAccountCurrency:
        qty !== 0 && total !== 0
          ? Math.abs((total + (type === 'BUY' ? fee : -fee)) / qty)
          : 0, // Approx price paid in account currency
      // Note on total: For BUY, Total is negative (-Cost -Fee). So Price*Qty = Total + Fee (abs).
      // Actually Total = -(Price*Qty*Rate + Fee). So (Total + Fee) is -(Price*Qty*Rate) roughly.

      nativePrice: price,
      nativeCurrency,
      isin,
      exchangeRate: exchangeRate || 1,
    };
  },
};
