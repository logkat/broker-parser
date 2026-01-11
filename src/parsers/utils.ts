export function parseNumber(val: string | number | null | undefined): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  // Handle Swedish format "1 234,50" -> 1234.50
  // Remove non-breaking spaces if any, regular spaces
  return parseFloat(val.toString().trim().replace(/\s/g, '').replace(',', '.'));
}

export function normalizeType(type: string) {
  if (!type) return 'OTHER';
  type = type.toUpperCase();
  if (
    type.includes('KÖP') ||
    type.includes('KÖPT') ||
    type.includes('BUY') ||
    type.includes('INBOKNING')
  )
    return 'BUY';
  if (
    type.includes('SÄLJ') ||
    type.includes('SÅLT') ||
    type.includes('SELL') ||
    type.includes('INLÖSEN') ||
    type.includes('REDEMPTION') ||
    type.includes('UTBOKNING') ||
    type.includes('FUSION') ||
    type.includes('MERGER') ||
    type.includes('MAKULERING')
  )
    return 'SELL';
  if (type.includes('UTDELNING') || type.includes('DIVIDEND'))
    return 'DIVIDEND';
  if (
    type.includes('INSÄTTNING') ||
    type.includes('DEPOSIT') ||
    type.includes('INS. KREDIT') ||
    type.includes('REALTIDSINSÄTTNING')
  )
    return 'DEPOSIT';
  if (type.includes('UTTAG') || type.includes('WITHDRAW')) return 'WITHDRAW';
  if (
    type.includes('RÄNTA') ||
    type.includes('INTEREST') ||
    type.includes('AVKASTNINGSSKATT')
  )
    return 'INTEREST'; // Treating taxes as interest/fee category often
  if (type.includes('SKATT') || type.includes('TAX')) return 'TAX';
  return 'OTHER';
}
