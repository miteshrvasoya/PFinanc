import { QueryHelper } from '../../database/queryHelper.js';

export interface ClassificationResult {
  categoryId: string | null;
  categoryName: string | null;
  transactionType: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'OTHER';
  confidence: 'USER_RULE' | 'SYSTEM_RULE' | 'TRANSFER_DETECTED' | 'NEEDS_REVIEW';
  rulePattern?: string;
  matchedRuleId?: string;
  isTransfer?: boolean;
  suggestedTransferAccount?: string;
}

// Built-in Indian & Global Merchant Classifier Dictionary
const SYSTEM_PATTERNS: Array<{
  pattern: RegExp;
  categoryName: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
}> = [
  // Food & Dining / Delivery
  { pattern: /SWIGGY|ZOMATO|EATS|DOMINOS|PIZZA|MCDONALD|BURGER|KFC|STARBUCKS|CHAAYOS|SUBWAY|DUNZO/i, categoryName: 'Food Delivery', type: 'EXPENSE' },
  { pattern: /GROFERS|BLINKIT|ZEPTO|BIGBASKET|DMART|D-MART|NATURES BASKET|SUPERMARKET|GROCERY|MORE RETAIL|RELIANCE FRESH|SPENCER/i, categoryName: 'Groceries', type: 'EXPENSE' },
  { pattern: /RESTAURANT|CAFE|DINER|DHABA|BIRYANI|BAKERY|SWEETS|HOTEL.*DINING/i, categoryName: 'Restaurants', type: 'EXPENSE' },
  
  // Utilities & Bills
  { pattern: /AIRTEL|JIO|VI\b|VODAFONE|IDEA|BSNL|POSTPAID|PREPAID|MOBILE RECHARGE/i, categoryName: 'Mobile Postpaid/Prepaid', type: 'EXPENSE' },
  { pattern: /ELECTRICITY|BESCOM|TNEB|MSEDCL|MSEB|TATA POWER|ADANI ELECTRICITY|PSPCL|UPPCL/i, categoryName: 'Electricity', type: 'EXPENSE' },
  { pattern: /BROADBAND|ACT FIBERNET|HATHWAY|EXCITEL|AIRTEL FIBER|JIOFIBER/i, categoryName: 'Internet & Wi-Fi', type: 'EXPENSE' },
  { pattern: /HP GAS|INDANE|BHARAT GAS|LPG|IGL|MGL/i, categoryName: 'Cooking Gas (LPG)', type: 'EXPENSE' },
  
  // Transportation & Fuel
  { pattern: /UBER|OLA|RAPIDO|AUTO|CAB|MERU|BLUSMART/i, categoryName: 'Taxi / Uber / Ola', type: 'EXPENSE' },
  { pattern: /PETROL|DIESEL|HPCL|BPCL|IOCL|INDIAN OIL|BHARAT PETROLEUM|HINDUSTAN PETROLEUM|SHELL|FUEL/i, categoryName: 'Fuel / Petrol / Diesel', type: 'EXPENSE' },
  { pattern: /IRCTC|METRO|RAILWAY|BUS|RED BUS|ABHIBUS|INDIGO|AIR INDIA|SPICEJET|VISTARA|AKASA/i, categoryName: 'Public Transport', type: 'EXPENSE' },
  
  // Shopping & Ecommerce
  { pattern: /AMAZON|FLIPKART|MYNTRA|AJIO|MEESHO|NYKAA|TATA CLIQ|SHOPPERS STOP|LIFESTYLE|ZARA|H&M/i, categoryName: 'Clothing & Apparel', type: 'EXPENSE' },
  
  // Entertainment & Subscriptions
  { pattern: /NETFLIX|PRIME VIDEO|HOTSTAR|DISNEY|SPOTIFY|APPLE MUSIC|YOUTUBE|BOOKMYSHOW|PVR|INOX|CINEPOLIS/i, categoryName: 'OTT Subscriptions', type: 'EXPENSE' },
  
  // Healthcare & Medical
  { pattern: /APOLLO|PHARMEASY|NETMEDS|1MG|MEDPLUS|HOSPITAL|CLINIC|LABS|DIAGNOSTICS|HEALTHKART/i, categoryName: 'Medicines & Pharmacy', type: 'EXPENSE' },
  
  // Financial & Bank Charges
  { pattern: /ANNUAL FEE|INTEREST CHG|PENALTY|CARD CHG|SMS CHG|ATM CHG|SERVICE CHARGE/i, categoryName: 'Bank Charges / Annual Fees', type: 'EXPENSE' },
  
  // Income Types
  { pattern: /SALARY|PAYROLL|WAGES|MONTHLY SALARY|COMPENSATION/i, categoryName: 'Primary Salary', type: 'INCOME' },
  { pattern: /DIVIDEND|INTEREST CR|INT\.PAID|INTEREST PAID/i, categoryName: 'Bank Interest (Savings/FD)', type: 'INCOME' },
  { pattern: /REFUND|REVERSAL|CASHBACK|REIMBURSEMENT/i, categoryName: 'Ecommerce Refund', type: 'INCOME' },
];

export class ClassificationService {
  /**
   * Classify a raw transaction description using multi-tier intelligence
   */
  static async classify(
    householdId: string,
    description: string,
    amount?: number,
    date?: string
  ): Promise<ClassificationResult> {
    const raw = description.trim().toUpperCase();

    // Priority 1: User / Household Specific Rules from classification_rules
    const userRules = await QueryHelper.query<any>(
      `SELECT cr.*, c.name as category_name
       FROM classification_rules cr
       LEFT JOIN categories c ON c.id = cr.category_id
       WHERE cr.household_id = $1
       ORDER BY cr.created_at DESC`,
      [householdId]
    );

    for (const rule of userRules) {
      let matched = false;
      const pat = rule.pattern.toUpperCase();

      if (rule.match_type === 'EXACT') {
        matched = raw === pat;
      } else if (rule.match_type === 'STARTS_WITH') {
        matched = raw.startsWith(pat);
      } else {
        // CONTAINS
        matched = raw.includes(pat);
      }

      if (matched) {
        return {
          categoryId: rule.category_id,
          categoryName: rule.category_name,
          transactionType: rule.transaction_type,
          confidence: 'USER_RULE',
          rulePattern: rule.pattern,
          matchedRuleId: rule.id,
        };
      }
    }

    // Priority 2: System Built-In Rules
    for (const sys of SYSTEM_PATTERNS) {
      if (sys.pattern.test(raw)) {
        // Find matching category id in DB
        const cat = await QueryHelper.queryOne<{ id: string; name: string }>(
          `SELECT id, name FROM categories 
           WHERE (household_id = $1 OR is_system = true) 
             AND name ILIKE $2
           LIMIT 1`,
          [householdId, `%${sys.categoryName}%`]
        );

        return {
          categoryId: cat?.id || null,
          categoryName: cat?.name || sys.categoryName,
          transactionType: sys.type,
          confidence: 'SYSTEM_RULE',
          rulePattern: sys.categoryName,
        };
      }
    }

    // Priority 3: Transfer Detection Signals
    const transferKeywords = /TRANSFER TO|TRANSFER FROM|SENT TO|RECEIVED FROM|UPI.*FATHER|UPI.*MOTHER|SELF TRANSFER/i;
    if (transferKeywords.test(raw)) {
      return {
        categoryId: null,
        categoryName: null,
        transactionType: 'TRANSFER',
        confidence: 'TRANSFER_DETECTED',
        isTransfer: true,
      };
    }

    // Priority 4: Default / Needs Review
    return {
      categoryId: null,
      categoryName: null,
      transactionType: 'EXPENSE',
      confidence: 'NEEDS_REVIEW',
    };
  }

  /**
   * Save or update a persistent user classification rule
   */
  static async saveRule(
    householdId: string,
    userId: string,
    data: {
      pattern: string;
      match_type?: 'EXACT' | 'CONTAINS' | 'STARTS_WITH' | 'REGEX';
      category_id: string;
      transaction_type?: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'OTHER';
    }
  ) {
    const pattern = data.pattern.trim().toUpperCase();
    const matchType = data.match_type || 'CONTAINS';
    const txType = data.transaction_type || 'EXPENSE';

    const existing = await QueryHelper.queryOne<{ id: string }>(
      `SELECT id FROM classification_rules WHERE household_id = $1 AND pattern = $2`,
      [householdId, pattern]
    );

    if (existing) {
      return QueryHelper.update('classification_rules', existing.id, {
        user_id: userId,
        match_type: matchType,
        category_id: data.category_id,
        transaction_type: txType,
        confidence: 'USER_RULE',
      }, 'household_id = $1', [householdId]);
    }

    return QueryHelper.insert('classification_rules', {
      household_id: householdId,
      user_id: userId,
      pattern,
      match_type: matchType,
      category_id: data.category_id,
      transaction_type: txType,
      confidence: 'USER_RULE',
    });
  }

  static async listRules(householdId: string) {
    return QueryHelper.query(
      `SELECT cr.*, c.name as category_name, u.name as user_name
       FROM classification_rules cr
       LEFT JOIN categories c ON c.id = cr.category_id
       LEFT JOIN users u ON u.id = cr.user_id
       WHERE cr.household_id = $1
       ORDER BY cr.created_at DESC`,
      [householdId]
    );
  }

  static async deleteRule(householdId: string, ruleId: string) {
    return QueryHelper.delete('classification_rules', ruleId, 'household_id = $1', [householdId]);
  }
}
