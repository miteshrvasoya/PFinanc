import { toLocalDateString } from '../../../../utils/date.js';
import { parse } from 'csv-parse/sync';
import { generateHash } from '../../../../utils/hash.js';

export interface ColumnMapping {
  dateCol?: string;
  symbolCol?: string;
  isinCol?: string;
  typeCol?: string;
  qtyCol?: string;
  priceCol?: string;
  amountCol?: string;
  feeCol?: string;
  taxCol?: string;
  refCol?: string;
  folioCol?: string;
  navCol?: string;
  averageCostCol?: string;
}

export class GenericCsvParser {
  /**
   * Automatically detect column mappings based on headers
   */
  static detectColumns(headers: string[]): ColumnMapping {
    const findCol = (...candidates: string[]) => {
      const lowerHeaders = headers.map(h => h.toLowerCase().trim());
      const match = candidates.find(c => lowerHeaders.some(h => h.includes(c)));
      if (!match) return undefined;
      return headers[lowerHeaders.findIndex(h => h.includes(match))];
    };

    return {
      dateCol: findCol('date', 'trade date', 'trans date', 'time'),
      symbolCol: findCol('symbol', 'stock', 'scrip', 'instrument', 'security', 'scheme', 'fund name'),
      isinCol: findCol('isin'),
      typeCol: findCol('type', 'action', 'buy_sell', 'trade type', 'transaction'),
      qtyCol: findCol('qty', 'quantity', 'shares', 'units'),
      priceCol: findCol('price', 'rate', 'cost per share'),
      amountCol: findCol('amount', 'gross', 'value', 'total', 'net'),
      feeCol: findCol('fee', 'charges', 'brokerage'),
      taxCol: findCol('tax', 'stt', 'gst'),
      refCol: findCol('ref', 'order_id', 'trade_id', 'id'),
      folioCol: findCol('folio'),
      navCol: findCol('nav', 'current nav'),
      averageCostCol: findCol('avg', 'average cost', 'avg cost'),
    };
  }

  /**
   * Parse CSV content into raw records
   */
  static parseRaw(csvContent: string): any[] {
    try {
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true
      });
      return records;
    } catch (e: any) {
      throw new Error(`Failed to parse CSV: ${e.message}`);
    }
  }

  /**
   * Parse statement dates into YYYY-MM-DD without timezone conversion.
   * Indian statements use day-first formats (DD-MM-YYYY, DD/MM/YYYY, DD-Mon-YYYY), which `new Date()`
   * either rejects or misreads as month-first; ISO strings are passed through unchanged.
   */
  static parseDate(raw: unknown): string | null {
    if (raw === undefined || raw === null) return null;
    const str = String(raw).trim();
    if (!str) return null;
    const months: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
    const build = (y: number, m: number, d: number) => {
      if (y < 100) y += 2000;
      const dt = new Date(Date.UTC(y, m - 1, d));
      if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    };
    let m = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (m) return build(+m[1], +m[2], +m[3]);
    m = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
    if (m) return build(+m[3], +m[2], +m[1]);
    m = str.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[A-Za-z]*[-/ ,]+(\d{2,4})/);
    if (m && months[m[2].toLowerCase()]) return build(+m[3], months[m[2].toLowerCase()], +m[1]);
    return null;
  }

  /**
   * Normalize a single row based on mapping and mode
   */
  static normalizeRow(
    rawRow: any, 
    mapping: ColumnMapping, 
    mode: 'TRANSACTIONS' | 'HOLDINGS', 
    type: 'STOCK' | 'MUTUAL_FUND',
    accountId: string
  ): any {
    const extractNum = (val: any) => {
      if (!val) return 0;
      const parsed = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    };

    const rawSymbol = mapping.symbolCol ? rawRow[mapping.symbolCol] : '';
    const rawIsin = mapping.isinCol ? rawRow[mapping.isinCol] : '';
    const signedQty = extractNum(mapping.qtyCol ? rawRow[mapping.qtyCol] : 0);
    // Many broker exports show sells as negative quantities; the ledger stores magnitudes + a type.
    const rawQty = Math.abs(signedQty);

    const parsedDate = mapping.dateCol ? GenericCsvParser.parseDate(rawRow[mapping.dateCol]) : null;

    if (mode === 'HOLDINGS') {
      const avgCost = extractNum(mapping.averageCostCol ? rawRow[mapping.averageCostCol] : 0) || extractNum(mapping.priceCol ? rawRow[mapping.priceCol] : 0);
      const currentPrice = extractNum(mapping.navCol ? rawRow[mapping.navCol] : (mapping.priceCol ? rawRow[mapping.priceCol] : 0));
      const investedValue = extractNum(mapping.amountCol ? rawRow[mapping.amountCol] : 0) || (rawQty * avgCost);
      const currentValue = rawQty * currentPrice;

      return {
        symbol: rawSymbol,
        isin: rawIsin,
        quantity: rawQty,
        averageCost: avgCost,
        investedAmount: investedValue,
        currentPrice: currentPrice,
        currentValue: currentValue,
        asOfDate: parsedDate || toLocalDateString(),
      };
    } else {
      // TRANSACTIONS
      let txType = 'BUY';
      const rawType = mapping.typeCol ? String(rawRow[mapping.typeCol] ?? '').toUpperCase() : signedQty < 0 ? 'SELL' : 'BUY';
      if (rawType.includes('SELL') || rawType.includes('REDEMP')) txType = 'SELL';
      else if (rawType.includes('SIP')) txType = 'SIP';
      else if (rawType.includes('DIV')) txType = 'DIVIDEND';
      else if (rawType.includes('BONUS')) txType = 'BONUS';
      else if (rawType.includes('SPLIT')) txType = 'SPLIT';
      
      const rawPrice = Math.abs(extractNum(mapping.priceCol ? rawRow[mapping.priceCol] : (mapping.navCol ? rawRow[mapping.navCol] : 0)));
      const rawAmount = Math.abs(extractNum(mapping.amountCol ? rawRow[mapping.amountCol] : 0)) || (rawQty * rawPrice);
      const rawFees = Math.abs(extractNum(mapping.feeCol ? rawRow[mapping.feeCol] : 0));
      const rawTaxes = Math.abs(extractNum(mapping.taxCol ? rawRow[mapping.taxCol] : 0));
      const ref = mapping.refCol ? rawRow[mapping.refCol] : '';
      const folio = mapping.folioCol ? rawRow[mapping.folioCol] : '';

      // Deterministic Fingerprint for transaction
      const fingerprintPayload = `${accountId}|${String(rawSymbol || '').toUpperCase()}|${parsedDate}|${txType}|${rawQty}|${rawPrice}|${rawAmount}|${ref}`;
      const hash = generateHash(fingerprintPayload);

      return {
        date: parsedDate,
        symbol: rawSymbol,
        isin: rawIsin,
        type: txType,
        quantity: rawQty,
        price: rawPrice,
        amount: rawAmount,
        fees: rawFees,
        taxes: rawTaxes,
        reference: ref,
        folio: folio,
        import_hash: hash
      };
    }
  }
}
