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
    const rawQty = extractNum(mapping.qtyCol ? rawRow[mapping.qtyCol] : 0);

    let parsedDate = null;
    if (mapping.dateCol && rawRow[mapping.dateCol]) {
      try {
        const d = new Date(rawRow[mapping.dateCol]);
        if (!isNaN(d.getTime())) {
          parsedDate = d.toISOString().split('T')[0];
        }
      } catch (e) {}
    }

    if (mode === 'HOLDINGS') {
      const avgCost = extractNum(mapping.averageCostCol ? rawRow[mapping.averageCostCol] : 0) || extractNum(mapping.priceCol ? rawRow[mapping.priceCol] : 0);
      const currentPrice = extractNum(mapping.navCol ? rawRow[mapping.navCol] : rawRow[mapping.priceCol]);
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
        asOfDate: parsedDate || new Date().toISOString().split('T')[0],
      };
    } else {
      // TRANSACTIONS
      let txType = 'BUY';
      const rawType = mapping.typeCol ? String(rawRow[mapping.typeCol]).toUpperCase() : 'BUY';
      if (rawType.includes('SELL') || rawType.includes('REDEMP')) txType = 'SELL';
      else if (rawType.includes('SIP')) txType = 'SIP';
      else if (rawType.includes('DIV')) txType = 'DIVIDEND';
      else if (rawType.includes('BONUS')) txType = 'BONUS';
      else if (rawType.includes('SPLIT')) txType = 'SPLIT';
      
      const rawPrice = extractNum(mapping.priceCol ? rawRow[mapping.priceCol] : (mapping.navCol ? rawRow[mapping.navCol] : 0));
      const rawAmount = extractNum(mapping.amountCol ? rawRow[mapping.amountCol] : 0) || (rawQty * rawPrice);
      const rawFees = extractNum(mapping.feeCol ? rawRow[mapping.feeCol] : 0);
      const rawTaxes = extractNum(mapping.taxCol ? rawRow[mapping.taxCol] : 0);
      const ref = mapping.refCol ? rawRow[mapping.refCol] : '';
      const folio = mapping.folioCol ? rawRow[mapping.folioCol] : '';

      // Deterministic Fingerprint for transaction
      const fingerprintPayload = `${accountId}|${rawSymbol.toUpperCase()}|${parsedDate}|${txType}|${rawQty}|${rawPrice}|${rawAmount}|${ref}`;
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
