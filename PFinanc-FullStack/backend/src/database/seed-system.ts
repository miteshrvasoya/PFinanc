import { QueryHelper } from './queryHelper.js';
import { pool } from './db.js';

/**
 * Production System Seed:
 * Seeds ONLY system default categories and core non-user metadata.
 * Contains ZERO sample users, accounts, balances, transactions, or fake numbers.
 */
export async function runSystemSeed() {
  console.log('Running Clean Production System Seed...');

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

    if (cat.children) {
      for (const childName of cat.children) {
        let child = await QueryHelper.queryOne(
          `SELECT id FROM categories WHERE name = $1 AND parent_category_id = $2 AND is_system = true`,
          [childName, parent.id]
        );
        if (!child) {
          await QueryHelper.insert('categories', {
            name: childName,
            type: cat.type,
            parent_category_id: parent.id,
            icon: cat.icon,
            color: cat.color,
            is_system: true,
            is_active: true,
          });
        }
      }
    }
  }

  console.log('Production System Seed completed successfully (Zero fake users or accounts).');
}

if (require.main === module) {
  runSystemSeed().then(() => pool.end()).then(() => process.exit(0));
}
