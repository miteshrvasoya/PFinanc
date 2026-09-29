/**
 * PFinanc — Financial domain types.
 * Mirrors PFinanc financial semantics:
 *   Income | Expense | Transfer | Investment
 */

export type TransactionType = 'income' | 'expense' | 'transfer' | 'investment';
export type TransactionStatus = 'confirmed' | 'pending_review' | 'rejected';
export type AccountType = 'savings' | 'salary' | 'cash' | 'wallet' | 'credit';

export interface Account {
  id: string;
  name: string;
  institution: string; // "HDFC Bank", "Cash in Hand"
  maskedNumber?: string; // "•••• 1234"
  type: AccountType;
  /** Balance in paise (Integer math, avoiding floating point) */
  balancePaise: number;
  icon: string; // Material symbol name
}

export interface Transaction {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  /** Amount in paise */
  amountPaise: number;
  merchant: string;
  category: string;
  categoryIcon: string;
  accountId: string;
  /** ISO date-time string */
  datetime: string;
  notes?: string;
  /** For transfers: destination account id */
  toAccountId?: string;
  /** Whether this was auto-detected from SMS */
  smsDetected?: boolean;
  smsRaw?: string;
}

export interface InvestmentHolding {
  id: string;
  name: string;
  quantity?: number;
  unit?: string; // "shares", "units"
  /** Current value in paise */
  currentValuePaise: number;
  /** Invested amount in paise */
  investedPaise: number;
  gainPercent: number;
  /** 'active' | 'inactive' */
  sipStatus?: 'active' | 'inactive';
  sipAmountPaise?: number;
  nextDate?: string;
}

export interface InvestmentClass {
  id: string;
  name: string;
  description: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  totalValuePaise: number;
  totalInvestedPaise: number;
  gainPercent: number;
  holdings: InvestmentHolding[];
  allocationPercent: number;
}

export interface NetWorthSummary {
  totalNetWorthPaise: number;
  assetsPaise: number;
  liabilitiesPaise: number;
  changePercent: number;
  updatedMinutesAgo: number;
}

export interface CashFlowSummary {
  incomePaise: number;
  expensePaise: number;
  savedPaise: number;
  month: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  initials: string;
  role: 'admin' | 'member';
  avatarColor: string;
  avatarTextColor: string;
}

export interface UserProfile {
  id: string;
  name: string;
  householdName: string;
  members: FamilyMember[];
  smsDetectionEnabled: boolean;
  hideBalances: boolean;
  biometricEnabled: boolean;
}
