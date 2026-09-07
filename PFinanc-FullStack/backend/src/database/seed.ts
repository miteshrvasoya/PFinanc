import bcrypt from 'bcryptjs';
import { QueryHelper } from './queryHelper.js';
import { pool } from './db.js';

export async function runSeed() {
  console.log('Starting seed...');

  // 1. Seed System Categories
  const systemCategories = [
    // Expense Categories
    { name: 'Food & Dining', type: 'EXPENSE', icon: 'Utensils', color: '#f97316', children: ['Groceries', 'Restaurants', 'Food Delivery', 'Coffee & Snacks'] },
    { name: 'Housing & Rent', type: 'EXPENSE', icon: 'Home', color: '#3b82f6', children: ['Rent / Mortgage', 'Maintenance', 'Property Tax', 'Home Furnishing'] },
    { name: 'Utilities', type: 'EXPENSE', icon: 'Zap', color: '#eab308', children: ['Electricity', 'Water', 'Internet & Wi-Fi', 'Mobile Postpaid/Prepaid', 'Cooking Gas (LPG)'] },
    { name: 'Transportation', type: 'EXPENSE', icon: 'Car', color: '#06b6d4', children: ['Fuel / Petrol / Diesel', 'Public Transport', 'Taxi / Uber / Ola', 'Vehicle Maintenance'] },
    { name: 'Shopping', type: 'EXPENSE', icon: 'ShoppingBag', color: '#ec4899', children: ['Electronics', 'Clothing & Apparel', 'Household Supplies', 'Personal Care'] },
    { name: 'Healthcare', type: 'EXPENSE', icon: 'HeartPulse', color: '#ef4444', children: ['Doctor Consultations', 'Medicines & Pharmacy', 'Diagnostic Tests', 'Health Insurance'] },
    { name: 'Entertainment', type: 'EXPENSE', icon: 'Film', color: '#8b5cf6', children: ['OTT Subscriptions', 'Movies & Events', 'Hobbies & Gaming', 'Vacation & Travel'] },
    { name: 'Education', type: 'EXPENSE', icon: 'GraduationCap', color: '#10b981', children: ['Tuition & School Fees', 'Books & Courses', 'Certifications'] },
    { name: 'Financial & Fees', type: 'EXPENSE', icon: 'Coins', color: '#64748b', children: ['Bank Charges / Annual Fees', 'Interest & Penalties', 'Tax Payments'] },
    
    // Income Categories
    { name: 'Salary & Wages', type: 'INCOME', icon: 'Briefcase', color: '#10b981', children: ['Primary Salary', 'Bonus & Incentives', 'Overtime'] },
    { name: 'Freelance & Business', type: 'INCOME', icon: 'Laptop', color: '#14b8a6', children: ['Client Projects', 'Consulting', 'Royalties'] },
    { name: 'Investment Income', type: 'INCOME', icon: 'TrendingUp', color: '#6366f1', children: ['Dividends', 'Bank Interest (Savings/FD)', 'Capital Gains'] },
    { name: 'Refunds & Reimbursements', type: 'INCOME', icon: 'RotateCcw', color: '#84cc16', children: ['Ecommerce Refund', 'Office Reimbursement', 'Tax Refund'] },
    { name: 'Other Income', type: 'INCOME', icon: 'PlusCircle', color: '#a855f7', children: ['Gifts', 'Rental Income', 'Miscellaneous'] },
  ];

  const categoryMap = new Map<string, string>();

  for (const cat of systemCategories) {
    let parent = await QueryHelper.queryOne(
      `SELECT id FROM categories WHERE name = $1 AND parent_category_id IS NULL AND is_system = true`,
      [cat.name]
    );

    if (!parent) {
      parent = await QueryHelper.insert('categories', {
        name: cat.name,
        type: cat.type,
        icon: cat.icon,
        color: cat.color,
        is_system: true,
        is_active: true,
      });
    }
    categoryMap.set(cat.name, parent.id);

    if (cat.children) {
      for (const childName of cat.children) {
        let child = await QueryHelper.queryOne(
          `SELECT id FROM categories WHERE name = $1 AND parent_category_id = $2`,
          [childName, parent.id]
        );
        if (!child) {
          child = await QueryHelper.insert('categories', {
            name: childName,
            type: cat.type,
            parent_category_id: parent.id,
            icon: cat.icon,
            color: cat.color,
            is_system: true,
            is_active: true,
          });
        }
        categoryMap.set(childName, child.id);
      }
    }
  }

  // 2. Seed Users
  const passwordHash = await bcrypt.hash('Password@123', 10);

  const usersData = [
    { email: 'mitesh@pfinanc.local', name: 'Mitesh Vasoya', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mitesh' },
    { email: 'father@pfinanc.local', name: 'Rameshbhai Vasoya (Father)', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Father' },
    { email: 'mother@pfinanc.local', name: 'Gitaben Vasoya (Mother)', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mother' },
  ];

  const userMap = new Map<string, any>();
  for (const u of usersData) {
    let user = await QueryHelper.queryOne(`SELECT * FROM users WHERE email = $1`, [u.email]);
    if (!user) {
      user = await QueryHelper.insert('users', {
        email: u.email,
        password_hash: passwordHash,
        name: u.name,
        avatar_url: u.avatar_url,
        status: 'ACTIVE',
      });
    }
    userMap.set(u.email, user);
  }

  const mitesh = userMap.get('mitesh@pfinanc.local');
  const father = userMap.get('father@pfinanc.local');
  const mother = userMap.get('mother@pfinanc.local');

  // 3. Seed Household: Vasoya Family
  let household = await QueryHelper.queryOne(`SELECT * FROM households WHERE name = $1`, ['Vasoya Family']);
  if (!household) {
    household = await QueryHelper.insert('households', {
      name: 'Vasoya Family',
      default_currency: 'INR',
      created_by: mitesh.id,
    });
  }

  // Seed Household Memberships
  const members = [
    { user_id: mitesh.id, role: 'OWNER' },
    { user_id: father.id, role: 'ADMIN' },
    { user_id: mother.id, role: 'MEMBER' },
  ];

  for (const m of members) {
    const existing = await QueryHelper.queryOne(
      `SELECT * FROM household_members WHERE household_id = $1 AND user_id = $2`,
      [household.id, m.user_id]
    );
    if (!existing) {
      await QueryHelper.insert('household_members', {
        household_id: household.id,
        user_id: m.user_id,
        role: m.role,
        status: 'ACTIVE',
      });
    }
  }

  // 4. Seed Financial Accounts (Banking + Brokerage)
  const accountsData = [
    {
      name: 'Mitesh - HDFC Bank',
      owner_user_id: mitesh.id,
      account_type: 'BANK',
      institution_name: 'HDFC Bank',
      account_number_masked: 'XXXX XXXX 4921',
      currency: 'INR',
      opening_balance: 72400.00,
      is_shared: false,
      notes: 'Primary salary and personal expense account',
    },
    {
      name: 'Father - SBI Savings',
      owner_user_id: father.id,
      account_type: 'BANK',
      institution_name: 'State Bank of India',
      account_number_masked: 'XXXX XXXX 8832',
      currency: 'INR',
      opening_balance: 125000.00,
      is_shared: false,
      notes: 'Father pension & household operational account',
    },
    {
      name: 'Mother - SBI Savings',
      owner_user_id: mother.id,
      account_type: 'BANK',
      institution_name: 'State Bank of India',
      account_number_masked: 'XXXX XXXX 2190',
      currency: 'INR',
      opening_balance: 85000.00,
      is_shared: false,
      notes: 'Mother personal savings',
    },
    {
      name: 'Family Cash Reserve',
      owner_user_id: mitesh.id,
      account_type: 'CASH',
      institution_name: 'Home Cash Vault',
      account_number_masked: 'CASH-001',
      currency: 'INR',
      opening_balance: 12000.00,
      is_shared: true,
      notes: 'Shared cash for domestic emergency & petty groceries',
    },
    {
      name: 'Mitesh - ICICI Sapphiro Credit Card',
      owner_user_id: mitesh.id,
      account_type: 'CREDIT_CARD',
      institution_name: 'ICICI Bank',
      account_number_masked: 'XXXX XXXX 1004',
      currency: 'INR',
      opening_balance: 0.00,
      is_shared: false,
      notes: 'Credit Card for flights & utilities',
    },
    {
      name: 'Mitesh - Zerodha Demat & Trading',
      owner_user_id: mitesh.id,
      account_type: 'BROKERAGE',
      institution_name: 'Zerodha Broking Ltd',
      account_number_masked: 'ZER-XXXX-9912',
      currency: 'INR',
      opening_balance: 0.00,
      is_shared: false,
      notes: 'Direct equity stock and ETF investment account',
    },
    {
      name: 'Father - Groww Mutual Funds',
      owner_user_id: father.id,
      account_type: 'MUTUAL_FUND',
      institution_name: 'Groww (Nextbillion Technology)',
      account_number_masked: 'GRW-XXXX-4411',
      currency: 'INR',
      opening_balance: 0.00,
      is_shared: false,
      notes: 'Direct mutual fund investments and SIPs',
    },
  ];

  const accountMap = new Map<string, any>();
  for (const acc of accountsData) {
    let account = await QueryHelper.queryOne(
      `SELECT * FROM accounts WHERE household_id = $1 AND name = $2`,
      [household.id, acc.name]
    );
    if (!account) {
      account = await QueryHelper.insert('accounts', {
        household_id: household.id,
        owner_user_id: acc.owner_user_id,
        name: acc.name,
        account_type: acc.account_type,
        institution_name: acc.institution_name,
        account_number_masked: acc.account_number_masked,
        currency: acc.currency,
        opening_balance: acc.opening_balance,
        opening_balance_date: '2026-08-01',
        is_shared: acc.is_shared,
        is_active: true,
        notes: acc.notes,
      });
    }
    accountMap.set(acc.name, account);
  }

  const miteshHdfc = accountMap.get('Mitesh - HDFC Bank');
  const fatherSbi = accountMap.get('Father - SBI Savings');
  const zerodhaAcc = accountMap.get('Mitesh - Zerodha Demat & Trading');
  const growwAcc = accountMap.get('Father - Groww Mutual Funds');

  // 5. Seed Securities & Daily Prices
  const securitiesData = [
    {
      symbol: 'RELIANCE',
      isin: 'INE002A01018',
      name: 'Reliance Industries Ltd',
      security_type: 'STOCK',
      exchange: 'NSE',
      sector: 'Energy & Conglomerate',
      asset_class: 'EQUITY',
      current_price: 1520.00,
    },
    {
      symbol: 'TCS',
      isin: 'INE467B01029',
      name: 'Tata Consultancy Services Ltd',
      security_type: 'STOCK',
      exchange: 'NSE',
      sector: 'Information Technology',
      asset_class: 'EQUITY',
      current_price: 4150.00,
    },
    {
      symbol: 'HDFCBANK',
      isin: 'INE040A01034',
      name: 'HDFC Bank Ltd',
      security_type: 'STOCK',
      exchange: 'NSE',
      sector: 'Banking & Financials',
      asset_class: 'EQUITY',
      current_price: 1680.00,
    },
    {
      symbol: 'PPFAS_FLEXICAP',
      isin: 'INF879O01018',
      name: 'Parag Parikh Flexi Cap Fund - Direct Growth',
      security_type: 'MUTUAL_FUND',
      exchange: 'AMFI',
      fund_house: 'PPFAS Mutual Fund',
      asset_class: 'MUTUAL_FUND',
      current_price: 118.20,
    },
    {
      symbol: 'NIFTYBEES',
      isin: 'INF204KB14I2',
      name: 'Nippon India ETF Nifty BeES',
      security_type: 'ETF',
      exchange: 'NSE',
      sector: 'Broad Market Index',
      asset_class: 'ETF',
      current_price: 275.50,
    },
  ];

  const secMap = new Map<string, any>();
  for (const s of securitiesData) {
    let sec = await QueryHelper.queryOne(`SELECT * FROM securities WHERE isin = $1`, [s.isin]);
    if (!sec) {
      sec = await QueryHelper.insert('securities', {
        symbol: s.symbol,
        isin: s.isin,
        name: s.name,
        security_type: s.security_type,
        exchange: s.exchange,
        currency: 'INR',
        sector: s.sector || null,
        fund_house: s.fund_house || null,
        asset_class: s.asset_class,
        is_active: true,
      });
    }
    secMap.set(s.symbol, sec);

    // Upsert current price
    await QueryHelper.query(
      `INSERT INTO security_prices (security_id, price_date, open, high, low, close, adjusted_close, source, is_stale)
       VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $5, 'SEED_DATA', false)
       ON CONFLICT (security_id, price_date) DO UPDATE SET close = EXCLUDED.close`,
      [sec.id, s.current_price * 0.99, s.current_price * 1.01, s.current_price * 0.985, s.current_price]
    );
  }

  // 6. Seed Investment Transactions (FIFO Buy lots, SIP, Dividends)
  const invTxCount = await QueryHelper.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM investment_transactions WHERE household_id = $1`,
    [household.id]
  );

  if (parseInt(invTxCount?.count || '0', 10) === 0) {
    console.log('Seeding investment transactions...');

    const reliance = secMap.get('RELIANCE');
    const tcs = secMap.get('TCS');
    const ppfas = secMap.get('PPFAS_FLEXICAP');

    // Mitesh buys 20 Reliance @ ₹1,400 (Net ₹28,060)
    await QueryHelper.insert('investment_transactions', {
      household_id: household.id,
      investment_account_id: zerodhaAcc.id,
      security_id: reliance.id,
      transaction_type: 'BUY',
      transaction_date: '2026-08-02',
      quantity: 20,
      price_per_unit: 1400.00,
      gross_amount: 28000.00,
      fees: 50.00,
      taxes: 10.00,
      net_amount: 28060.00,
      source: 'MANUAL',
      status: 'CONFIRMED',
      created_by: mitesh.id,
    });

    // Mitesh buys 10 TCS @ ₹3,800 (Net ₹38,070)
    await QueryHelper.insert('investment_transactions', {
      household_id: household.id,
      investment_account_id: zerodhaAcc.id,
      security_id: tcs.id,
      transaction_type: 'BUY',
      transaction_date: '2026-08-04',
      quantity: 10,
      price_per_unit: 3800.00,
      gross_amount: 38000.00,
      fees: 60.00,
      taxes: 10.00,
      net_amount: 38070.00,
      source: 'MANUAL',
      status: 'CONFIRMED',
      created_by: mitesh.id,
    });

    // Father records SIP in Parag Parikh Flexi Cap ₹10,000 @ NAV ₹112.50 (88.88888889 units)
    await QueryHelper.insert('investment_transactions', {
      household_id: household.id,
      investment_account_id: growwAcc.id,
      security_id: ppfas.id,
      transaction_type: 'SIP',
      transaction_date: '2026-08-10',
      quantity: 88.88888889,
      price_per_unit: 112.50,
      gross_amount: 10000.00,
      fees: 0.00,
      taxes: 0.00,
      net_amount: 10000.00,
      source: 'MANUAL',
      status: 'CONFIRMED',
      created_by: father.id,
    });

    // Mitesh receives Reliance Dividend ₹400
    await QueryHelper.insert('investment_transactions', {
      household_id: household.id,
      investment_account_id: zerodhaAcc.id,
      security_id: reliance.id,
      transaction_type: 'DIVIDEND',
      transaction_date: '2026-08-14',
      gross_amount: 400.00,
      net_amount: 400.00,
      source: 'MANUAL',
      status: 'CONFIRMED',
      created_by: mitesh.id,
    });
  }

  // 7. Seed Fixed Deposits & Retirement Accounts
  const fdCount = await QueryHelper.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM fixed_deposits WHERE household_id = $1`,
    [household.id]
  );
  if (parseInt(fdCount?.count || '0', 10) === 0) {
    await QueryHelper.insert('fixed_deposits', {
      household_id: household.id,
      owner_user_id: father.id,
      institution_name: 'State Bank of India',
      fd_number_masked: 'FD-SBI-XXXX-9012',
      principal_amount: 100000.00,
      interest_rate: 7.25,
      compounding_frequency: 'QUARTERLY',
      start_date: '2026-01-01',
      maturity_date: '2027-01-01',
      maturity_amount: 107449.00,
      current_value: 104520.00,
      status: 'ACTIVE',
      notes: 'Father 1-Year Cumulative Fixed Deposit',
    });
  }

  const retCount = await QueryHelper.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM retirement_accounts WHERE household_id = $1`,
    [household.id]
  );
  if (parseInt(retCount?.count || '0', 10) === 0) {
    const epf = await QueryHelper.insert('retirement_accounts', {
      household_id: household.id,
      user_id: mitesh.id,
      asset_type: 'EPF',
      institution_name: 'EPFO (Employees Provident Fund Organisation)',
      account_number_masked: 'EPF-MH-BAN-XXXX-1029',
      opening_balance: 450000.00,
      current_balance: 457200.00,
      notes: 'Mitesh Primary Corporate EPF',
    });

    await QueryHelper.insert('retirement_contributions', {
      retirement_account_id: epf.id,
      household_id: household.id,
      contribution_date: '2026-08-01',
      employee_contribution: 3600.00,
      employer_contribution: 3600.00,
      interest_amount: 0.00,
      withdrawal_amount: 0.00,
      total_closing_balance: 457200.00,
      notes: 'August 2026 Monthly EPF Contribution',
    });

    await QueryHelper.insert('retirement_accounts', {
      household_id: household.id,
      user_id: father.id,
      asset_type: 'PPF',
      institution_name: 'State Bank of India (PPF)',
      account_number_masked: 'PPF-SBI-XXXX-5521',
      opening_balance: 320000.00,
      current_balance: 320000.00,
      notes: 'Father Public Provident Fund Account',
    });
  }

  console.log('Seed completed successfully with Phase 2 investment assets!');
}

if (require.main === module) {
  runSeed().then(() => pool.end()).then(() => process.exit(0));
}
