import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './client';

// react-native-get-sms-android is Android-only
let SmsAndroid: any = null;
if (Platform.OS === 'android') {
  try {
    const mod = require('react-native-get-sms-android');
    SmsAndroid = mod ? (mod.default || mod) : null;
  } catch (e) {
    console.log("Failed to load react-native-get-sms-android", e);
  }
}

// Known Indian bank SMS sender IDs (expand as needed)
const BANK_SENDERS = [
  'HDFCBK', 'ICICIB', 'SBIINB', 'AXISBK', 'KOTAKB',
  'YESBNK', 'INDUSB', 'PNBSMS', 'BOIIND', 'CANBNK',
  'SCBANK', 'CITIBK', 'HSBCIN', 'RBLBNK', 'IDBIBK',
  'PAYTMB', 'UCOBNK', 'BRKBNK', 'IOBSMS', 'UNIONB',
  'BW-HDFCBK', 'VM-ICICIB', 'AX-AXISBK', 'BW-SBIINB',
];

// Basic filter: message must mention money/debit/credit
const FINANCIAL_KEYWORDS = [
  'debited', 'credited', 'spent', 'withdrawn', 'transferred',
  'payment', 'rs.', 'rs ', 'inr', '₹', 'amount', 'bal',
  'transaction', 'purchase', 'upi', 'neft', 'imps', 'rtgs'
];

export interface RawSMS {
  _id: string;
  address: string; // sender
  body: string;
  date: number;   // epoch ms
  date_sent: number;
}

/** Shape the backend's POST /api/automation/candidates/sync expects. */
export interface SMSCandidate {
  messageHash: string;
  sender: string;
  body: string;
  receivedAt: string; // ISO string
}

export interface SyncSummary {
  created: number;
  duplicates: number;
  ignored: number;
  errors: number;
  firstError?: string;
}

/** Stable per-install id; the backend requires it in the x-device-id header. */
export async function getDeviceId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem('device_id');
    if (existing) return existing;
  } catch {}
  const id = 'dev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  try { await AsyncStorage.setItem('device_id', id); } catch {}
  return id;
}

/** Request READ_SMS permission on Android */
export async function requestSmsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      {
        title: 'PFinanc needs SMS access',
        message:
          'PFinanc reads your bank SMS messages to automatically detect transactions. ' +
          'All parsing happens on your device — no raw SMS text is ever uploaded.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Deny',
        buttonPositive: 'Allow',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

/** Check if permission was already granted */
export async function checkSmsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
  } catch {
    return false;
  }
}

/** Read inbox SMS, filtered to bank senders */
export async function readBankSMS(maxCount = 200, daysBack = 90): Promise<RawSMS[]> {
  if (!SmsAndroid) return [];

  const minDate = Date.now() - daysBack * 24 * 60 * 60 * 1000;

  return new Promise((resolve, reject) => {
    SmsAndroid.list(
      JSON.stringify({
        box: 'inbox',
        maxCount,
        minDate,
      }),
      (fail: string) => reject(new Error(fail)),
      (_count: number, smsList: string) => {
        try {
          const all: RawSMS[] = JSON.parse(smsList);
          const filtered = all.filter((sms) => isFinancialSMS(sms));
          resolve(filtered);
        } catch (e) {
          resolve([]);
        }
      }
    );
  });
}

function isFinancialSMS(sms: RawSMS): boolean {
  const sender = (sms.address || '').toUpperCase();
  const body = (sms.body || '').toLowerCase();

  const fromBank = BANK_SENDERS.some((s) => sender.includes(s));
  const hasFinancialWord = FINANCIAL_KEYWORDS.some((kw) => body.includes(kw));

  return fromBank || hasFinancialWord;
}

/** Convert raw SMS list into the backend-ready candidates payload */
export function buildCandidatesPayload(smsList: RawSMS[]): SMSCandidate[] {
  return smsList.map((sms) => ({
    // Hash content (not the device-local _id) so the same message dedupes across reinstalls.
    messageHash: hash53(`${sms.address}|${sms.date}|${sms.body}`),
    sender: sms.address,
    body: sms.body,
    receivedAt: new Date(sms.date).toISOString(),
  }));
}

/** Send candidates to the backend in batches and summarise what happened. */
export async function syncSmsCandidates(candidates: SMSCandidate[]): Promise<SyncSummary> {
  const summary: SyncSummary = { created: 0, duplicates: 0, ignored: 0, errors: 0 };
  const deviceId = await getDeviceId();
  const BATCH = 40;

  for (let i = 0; i < candidates.length; i += BATCH) {
    const res = await apiClient.post(
      '/api/automation/candidates/sync',
      { candidates: candidates.slice(i, i + BATCH) },
      { 'x-device-id': deviceId }
    );
    const results: any[] = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    for (const r of results) {
      if (r.status === 'CANDIDATE_CREATED') summary.created++;
      else if (r.status === 'IGNORED') summary.ignored++;
      else if (r.status === 'ERROR') { summary.errors++; summary.firstError ||= r.error; }
      else summary.duplicates++;
    }
  }
  return summary;
}

// cyrb53: fast 53-bit string hash (far fewer collisions than a 32-bit hash)
function hash53(str: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}
