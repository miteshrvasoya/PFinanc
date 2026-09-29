/**
 * PFinanc — Mock data service
 * Provides static mock data matching the Stitch design screens.
 * Real API calls can be swapped in here without touching the UI.
 */

import type {
  Account,
  Transaction,
  InvestmentClass,
  NetWorthSummary,
  CashFlowSummary,
  UserProfile,
  FamilyMember,
} from '../types/financial';

// ─── Accounts ────────────────────────────────────────────────────────────────

export const ACCOUNTS: Account[] = [
  {
    id: 'hdfc-1234',
    name: 'HDFC Bank',
    institution: 'HDFC Bank',
    maskedNumber: '•••• 1234',
    type: 'savings',
    balancePaise: 4_250_000, // ₹42,500
    icon: 'account_balance',
  },
  {
    id: 'icici-5678',
    name: 'ICICI Bank',
    institution: 'ICICI Bank',
    maskedNumber: '•••• 5678',
    type: 'salary',
    balancePaise: 1_820_000, // ₹18,200
    icon: 'account_balance',
  },
  {
    id: 'cash-hand',
    name: 'Cash in Hand',
    institution: 'Physical Wallet',
    type: 'cash',
    balancePaise: 500_000, // ₹5,000
    icon: 'payments',
  },
];

// ─── Transactions ─────────────────────────────────────────────────────────────

export const TRANSACTIONS: Transaction[] = [
  {
    id: 'txn-001',
    type: 'expense',
    status: 'pending_review',
    amountPaise: -85_000, // -₹850
    merchant: 'Swiggy',
    category: 'Food & Dining',
    categoryIcon: 'restaurant',
    accountId: 'hdfc-1234',
    datetime: '2026-09-27T14:34:00+05:30',
    notes: 'Dinner with family',
    smsDetected: true,
    smsRaw: 'HDFC Bank: Rs 850.00 spent at Swiggy on 27-Sep-26 via card ending 1234.',
  },
  {
    id: 'txn-002',
    type: 'expense',
    status: 'pending_review',
    amountPaise: -129_900, // -₹1,299
    merchant: 'Amazon India',
    category: 'Shopping',
    categoryIcon: 'shopping_bag',
    accountId: 'hdfc-1234',
    datetime: '2026-09-27T11:02:00+05:30',
    smsDetected: true,
    smsRaw: 'HDFC Bank: Rs 1299.00 spent at Amazon India on 27-Sep-26 via card ending 1234.',
  },
  {
    id: 'txn-003',
    type: 'income',
    status: 'confirmed',
    amountPaise: 6_500_000, // +₹65,000
    merchant: 'Salary Deposit',
    category: 'Income',
    categoryIcon: 'work',
    accountId: 'icici-5678',
    datetime: '2026-09-27T06:00:00+05:30',
    smsDetected: true,
  },
  {
    id: 'txn-004',
    type: 'expense',
    status: 'confirmed',
    amountPaise: -210_000, // -₹2,100
    merchant: 'Electricity Bill (Adani Power)',
    category: 'Utilities & Bills',
    categoryIcon: 'bolt',
    accountId: 'hdfc-1234',
    datetime: '2026-09-26T20:45:00+05:30',
  },
  {
    id: 'txn-005',
    type: 'transfer',
    status: 'confirmed',
    amountPaise: -1_000_000, // -₹10,000
    merchant: 'Transfer to Father',
    category: 'Move Money',
    categoryIcon: 'sync_alt',
    accountId: 'icici-5678',
    toAccountId: 'ext-father',
    datetime: '2026-09-26T16:15:00+05:30',
  },
  {
    id: 'txn-006',
    type: 'expense',
    status: 'pending_review',
    amountPaise: -342_000, // -₹3,420
    merchant: 'BigBasket',
    category: 'Groceries',
    categoryIcon: 'local_mall',
    accountId: 'icici-5678',
    datetime: '2026-09-25T10:30:00+05:30',
    smsDetected: true,
  },
];

// ─── Investments ──────────────────────────────────────────────────────────────

export const INVESTMENTS: InvestmentClass[] = [
  {
    id: 'stocks',
    name: 'My Stocks',
    description: 'Direct equity portfolio',
    icon: 'candlestick_chart',
    iconBg: '#F2F4F5',
    iconColor: '#00216e',
    totalValuePaise: 20_000_000, // ₹2,00,000
    totalInvestedPaise: 16_920_000,
    gainPercent: 18.2,
    allocationPercent: 47,
    holdings: [
      {
        id: 'kpit',
        name: 'KPIT Technologies',
        quantity: 12,
        unit: 'shares',
        currentValuePaise: 693_600, // ₹6,936
        investedPaise: 671_040,
        gainPercent: 3.4,
      },
      {
        id: 'suzlon',
        name: 'Suzlon Energy',
        quantity: 110,
        unit: 'shares',
        currentValuePaise: 583_000, // ₹5,830
        investedPaise: 576_100,
        gainPercent: 1.2,
      },
    ],
  },
  {
    id: 'mutual-funds',
    name: 'Mutual Funds (SIP)',
    description: 'Disciplined recurring deposits',
    icon: 'autorenew',
    iconBg: '#E7F5EE',
    iconColor: '#128A58',
    totalValuePaise: 15_000_000, // ₹1,50,000
    totalInvestedPaise: 12_090_000,
    gainPercent: 24.1,
    allocationPercent: 35,
    holdings: [
      {
        id: 'mirae-largecap',
        name: 'Mirae Asset Large Cap',
        sipStatus: 'active',
        sipAmountPaise: 500_000, // ₹5,000/mo
        currentValuePaise: 7_800_000,
        investedPaise: 6_300_000,
        gainPercent: 23.8,
        nextDate: 'Oct 5',
      },
      {
        id: 'parag-flexi',
        name: 'Parag Parikh Flexi Cap',
        sipStatus: 'active',
        sipAmountPaise: 500_000,
        currentValuePaise: 7_200_000,
        investedPaise: 5_790_000,
        gainPercent: 24.4,
        nextDate: 'Autopay On',
      },
    ],
  },
  {
    id: 'epf-ppf',
    name: 'EPF & PPF',
    description: 'Government & Retirement Schemes',
    icon: 'account_balance',
    iconBg: '#F2F4F5',
    iconColor: '#111e1d',
    totalValuePaise: 7_500_000, // ₹75,000
    totalInvestedPaise: 7_500_000,
    gainPercent: 0,
    allocationPercent: 18,
    holdings: [],
  },
];

// ─── Net Worth ────────────────────────────────────────────────────────────────

export const NET_WORTH: NetWorthSummary = {
  totalNetWorthPaise: 124_500_000, // ₹12,45,000
  assetsPaise: 152_000_000,        // ₹15,20,000
  liabilitiesPaise: 27_500_000,    // ₹2,75,000
  changePercent: 3.2,
  updatedMinutesAgo: 10,
};

// ─── Cash Flow ────────────────────────────────────────────────────────────────

export const CASH_FLOW: CashFlowSummary = {
  incomePaise: 6_500_000,   // ₹65,000
  expensePaise: 2_850_000,  // ₹28,500
  savedPaise: 3_650_000,    // ₹36,500
  month: 'September 2026',
};

// ─── User Profile ─────────────────────────────────────────────────────────────

export const FAMILY_MEMBERS: FamilyMember[] = [
  { id: 'mitesh', name: 'Mitesh', initials: 'MV', role: 'admin', avatarColor: '#0033a0', avatarTextColor: '#ffffff' },
  { id: 'disha', name: 'Disha', initials: 'DV', role: 'member', avatarColor: '#8ff8bc', avatarTextColor: '#002111' },
  { id: 'kanti', name: 'Kanti (Father)', initials: 'KV', role: 'member', avatarColor: '#dcebe9', avatarTextColor: '#111e1d' },
  { id: 'bhavna', name: 'Bhavna (Mother)', initials: 'BV', role: 'member', avatarColor: '#dcebe9', avatarTextColor: '#111e1d' },
];

export const USER_PROFILE: UserProfile = {
  id: 'mitesh-vasoya',
  name: 'Mitesh Vasoya',
  householdName: 'Vasoya Family',
  members: FAMILY_MEMBERS,
  smsDetectionEnabled: true,
  hideBalances: false,
  biometricEnabled: true,
};

// ─── Service API Boundary ─────────────────────────────────────────────────────

export const FinancialService = {
  getAccounts: (): Promise<Account[]> => Promise.resolve(ACCOUNTS),
  getTransactions: (): Promise<Transaction[]> => Promise.resolve(TRANSACTIONS),
  getPendingReview: (): Promise<Transaction[]> =>
    Promise.resolve(TRANSACTIONS.filter(t => t.status === 'pending_review')),
  getInvestments: (): Promise<InvestmentClass[]> => Promise.resolve(INVESTMENTS),
  getNetWorth: (): Promise<NetWorthSummary> => Promise.resolve(NET_WORTH),
  getCashFlow: (): Promise<CashFlowSummary> => Promise.resolve(CASH_FLOW),
  getUserProfile: (): Promise<UserProfile> => Promise.resolve(USER_PROFILE),
  approveTransaction: (id: string): Promise<void> => Promise.resolve(),
  rejectTransaction: (id: string): Promise<void> => Promise.resolve(),
  addTransaction: (tx: Omit<Transaction, 'id' | 'status'>): Promise<Transaction> =>
    Promise.resolve({ ...tx, id: `txn-${Date.now()}`, status: 'confirmed' }),
};
