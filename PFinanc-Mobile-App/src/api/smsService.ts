import { Platform, PermissionsAndroid, Alert } from 'react-native';

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

export interface SMSCandidate {
  sms_hash: string;
  sender: string;
  body: string;
  received_at: string; // ISO string
  raw_date: number;
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

/** Convert raw SMS list into backend-ready candidates payload */
export function buildCandidatesPayload(smsList: RawSMS[]): SMSCandidate[] {
  return smsList.map((sms) => ({
    sms_hash: simpleHash(`${sms._id}-${sms.date}`),
    sender: sms.address,
    body: sms.body,
    received_at: new Date(sms.date).toISOString(),
    raw_date: sms.date,
  }));
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}
