import { pool } from '../../database/db.js';
import { QueryHelper } from '../../database/queryHelper.js';

/**
 * Angel One quotes by numeric token, so PFinanc symbols must be mapped to tokens. Angel One publishes a public
 * instrument master (~42 MB JSON, ~180k rows incl. derivatives). We stream it and keep only NSE/BSE cash-market
 * rows (~23k) in `angelone_instruments`, refreshed when older than a few days.
 */

export const INSTRUMENT_MASTER_URL = 'https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json';
const MAX_AGE_MS = 3 * 86_400_000;
const BATCH = 1000;

// NSE series suffixes that Angel One appends to trading symbols (RELIANCE-EQ).
const SERIES_SUFFIX = /-(EQ|BE|BL|BZ|IL|IQ|SM|ST|GS|GB|SG|MF|N\d|W\d|Y\d|Z\d)$/;
/** Preference when several NSE series exist for one name (lower is better). */
const SERIES_RANK: Record<string, number> = { EQ: 0, BE: 1, BL: 2, BZ: 3, SM: 4, ST: 5 };

/** "RELIANCE-EQ" -> "RELIANCE"; "BAJAJ-AUTO-EQ" -> "BAJAJ-AUTO"; "M&M-EQ" -> "M&M". Symbols without a series are unchanged. */
export const baseSymbol = (tradingSymbol: string) => tradingSymbol.toUpperCase().replace(SERIES_SUFFIX, '');
export const seriesOf = (tradingSymbol: string) => SERIES_SUFFIX.exec(tradingSymbol.toUpperCase())?.[1] ?? null;

interface MasterRow { token: string; symbol: string; name: string; instrumenttype: string; exch_seg: string }

/**
 * Pull complete flat JSON objects ({...} with no nesting, as in the instrument master) out of a text buffer.
 * Returns the parsed objects and the unconsumed tail, so a stream can be processed in arbitrary chunks.
 */
export function extractFlatObjects(buffer: string): { objects: any[]; rest: string } {
  const objects: any[] = [];
  let lastEnd = 0;
  const re = /\{[^{}]*\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(buffer))) {
    try { objects.push(JSON.parse(m[0])); } catch { /* skip a malformed row */ }
    lastEnd = re.lastIndex;
  }
  return { objects, rest: buffer.slice(lastEnd) };
}

const isCashRow = (r: MasterRow) => (r.exch_seg === 'NSE' || r.exch_seg === 'BSE') && r.instrumenttype === '' && !!r.token && !!r.symbol;

/** Stream a response body, yielding the NSE/BSE cash rows. */
export async function* readCashRows(body: ReadableStream<Uint8Array>): AsyncGenerator<MasterRow> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let rest = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    const parsed = extractFlatObjects(rest + decoder.decode(value, { stream: true }));
    rest = parsed.rest;
    for (const o of parsed.objects) if (isCashRow(o)) yield o as MasterRow;
  }
  const tail = extractFlatObjects(rest + decoder.decode());
  for (const o of tail.objects) if (isCashRow(o)) yield o as MasterRow;
}

let inflight: Promise<number> | null = null;

/** Download the master and replace the table contents atomically. Returns the number of rows stored. */
export function refreshInstrumentMaster(fetchImpl: typeof fetch = fetch): Promise<number> {
  if (inflight) return inflight;
  inflight = (async () => {
    const res = await fetchImpl(INSTRUMENT_MASTER_URL, { signal: AbortSignal.timeout(120_000) });
    if (!res.ok || !res.body) throw new Error(`Instrument master download failed (HTTP ${res.status}).`);

    const client = await pool.connect();
    let stored = 0;
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM angelone_instruments');
      let batch: MasterRow[] = [];
      const flush = async () => {
        if (!batch.length) return;
        const values: any[] = [];
        const tuples = batch.map((r, i) => {
          values.push(r.exch_seg, r.token, r.symbol, r.name || r.symbol, r.exch_seg === 'NSE' ? seriesOf(r.symbol) : null);
          const o = i * 5;
          return `($${o + 1},$${o + 2},$${o + 3},$${o + 4},$${o + 5})`;
        });
        await client.query(
          `INSERT INTO angelone_instruments (exch_seg, token, symbol, name, series) VALUES ${tuples.join(',')}
           ON CONFLICT (exch_seg, token) DO UPDATE SET symbol = EXCLUDED.symbol, name = EXCLUDED.name, series = EXCLUDED.series, loaded_at = NOW()`,
          values
        );
        stored += batch.length;
        batch = [];
      };
      for await (const row of readCashRows(res.body)) {
        batch.push(row);
        if (batch.length >= BATCH) await flush();
      }
      await flush();
      if (stored < 1000) throw new Error('Instrument master looked incomplete; keeping the previous data.');
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
    return stored;
  })().finally(() => { inflight = null; });
  return inflight;
}

/** Make sure the table is populated and reasonably fresh. A refresh failure is tolerated when old data exists. */
export async function ensureInstrumentMaster(): Promise<void> {
  const info = await QueryHelper.queryOne<{ n: string; newest: Date | null }>(`SELECT COUNT(*)::text AS n, MAX(loaded_at) AS newest FROM angelone_instruments`);
  const count = Number(info?.n || 0);
  const fresh = info?.newest && Date.now() - new Date(info.newest).getTime() < MAX_AGE_MS;
  if (count > 0 && fresh) return;
  try {
    await refreshInstrumentMaster();
  } catch (err) {
    if (count === 0) throw err;
    console.warn('[AngelOne] Instrument master refresh failed, using older data:', (err as Error).message);
  }
}

export interface ResolvedInstrument { exchange: 'NSE' | 'BSE'; token: string; tradingSymbol: string }

/** Map PFinanc securities to Angel One tokens. Securities with no match are simply absent from the result. */
export async function resolveInstruments(
  securities: Array<{ id: string; symbol: string; exchange: string }>
): Promise<Map<string, ResolvedInstrument>> {
  const out = new Map<string, ResolvedInstrument>();
  if (securities.length === 0) return out;

  const names = Array.from(new Set(securities.map((s) => baseSymbol(s.symbol))));
  const rows = await QueryHelper.query<{ exch_seg: 'NSE' | 'BSE'; token: string; symbol: string; name: string; series: string | null }>(
    `SELECT exch_seg, token, symbol, name, series FROM angelone_instruments WHERE UPPER(name) = ANY($1::text[]) OR UPPER(symbol) = ANY($1::text[])`,
    [names]
  );

  for (const sec of securities) {
    const want = baseSymbol(sec.symbol);
    const prefer: Array<'NSE' | 'BSE'> = sec.exchange === 'BSE' ? ['BSE', 'NSE'] : ['NSE', 'BSE'];
    for (const exch of prefer) {
      const candidates = rows
        .filter((r) => r.exch_seg === exch && (r.name.toUpperCase() === want || baseSymbol(r.symbol) === want))
        .sort((a, b) => (SERIES_RANK[a.series ?? ''] ?? 9) - (SERIES_RANK[b.series ?? ''] ?? 9));
      if (candidates[0]) {
        out.set(sec.id, { exchange: exch, token: candidates[0].token, tradingSymbol: candidates[0].symbol });
        break;
      }
    }
  }
  return out;
}
