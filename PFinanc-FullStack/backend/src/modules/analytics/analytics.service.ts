import { QueryHelper } from '../../database/queryHelper.js';

export class AnalyticsService {
  static async getMonthlyTrends(householdId: string, months = 6) {
    const sql = `
      WITH months AS (
        SELECT 
          TO_CHAR(d, 'YYYY-MM') AS month_key,
          TO_CHAR(d, 'Mon YYYY') AS month_label,
          DATE_TRUNC('month', d)::date AS start_date,
          (DATE_TRUNC('month', d) + INTERVAL '1 month - 1 day')::date AS end_date
        FROM GENERATE_SERIES(
          DATE_TRUNC('month', CURRENT_DATE) - (( $2 - 1 ) || ' months')::INTERVAL,
          DATE_TRUNC('month', CURRENT_DATE),
          '1 month'::INTERVAL
        ) d
      )
      SELECT 
        m.month_key,
        m.month_label,
        COALESCE(SUM(CASE WHEN t.status = 'CONFIRMED' AND t.transaction_type IN ('INCOME', 'REFUND') THEN t.amount ELSE 0 END), 0)::FLOAT AS income,
        COALESCE(SUM(CASE WHEN t.status = 'CONFIRMED' AND t.transaction_type IN ('EXPENSE', 'FEE') THEN t.amount ELSE 0 END), 0)::FLOAT AS expense,
        (
          COALESCE(SUM(CASE WHEN t.status = 'CONFIRMED' AND t.transaction_type IN ('INCOME', 'REFUND') THEN t.amount ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN t.status = 'CONFIRMED' AND t.transaction_type IN ('EXPENSE', 'FEE') THEN t.amount ELSE 0 END), 0)
        )::FLOAT AS net_cash_flow
      FROM months m
      LEFT JOIN transactions t ON t.household_id = $1 AND t.transaction_date >= m.start_date AND t.transaction_date <= m.end_date
      GROUP BY m.month_key, m.month_label, m.start_date
      ORDER BY m.start_date ASC
    `;

    return QueryHelper.query(sql, [householdId, months]);
  }

  static async getCategoryAnalytics(householdId: string, startDate?: string, endDate?: string, type: 'EXPENSE' | 'INCOME' = 'EXPENSE') {
    const conditions = [
      't.household_id = $1',
      't.status = \'CONFIRMED\'',
      type === 'EXPENSE' ? 't.transaction_type IN (\'EXPENSE\', \'FEE\')' : 't.transaction_type IN (\'INCOME\', \'REFUND\')',
    ];
    const params: any[] = [householdId];

    if (startDate) {
      params.push(startDate);
      conditions.push(`t.transaction_date >= $${params.length}`);
    }

    if (endDate) {
      params.push(endDate);
      conditions.push(`t.transaction_date <= $${params.length}`);
    }

    const where = conditions.join(' AND ');

    const sql = `
      SELECT 
        COALESCE(c.id, '00000000-0000-0000-0000-000000000000') AS category_id,
        COALESCE(c.name, 'Uncategorized') AS category_name,
        COALESCE(c.icon, 'HelpCircle') AS category_icon,
        COALESCE(c.color, '#94a3b8') AS category_color,
        COUNT(t.id)::INT AS transaction_count,
        SUM(t.amount)::FLOAT AS total_amount
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      WHERE ${where}
      GROUP BY c.id, c.name, c.icon, c.color
      ORDER BY total_amount DESC
    `;

    return QueryHelper.query(sql, params);
  }

  static async getFamilyBreakdown(householdId: string, startDate?: string, endDate?: string) {
    const conditions = ['t.household_id = $1', 't.status = \'CONFIRMED\''];
    const params: any[] = [householdId];

    if (startDate) {
      params.push(startDate);
      conditions.push(`t.transaction_date >= $${params.length}`);
    }

    if (endDate) {
      params.push(endDate);
      conditions.push(`t.transaction_date <= $${params.length}`);
    }

    const where = conditions.join(' AND ');

    const sql = `
      SELECT 
        u.id AS user_id,
        u.name AS user_name,
        u.email AS user_email,
        u.avatar_url,
        hm.role,
        COALESCE(SUM(CASE WHEN t.transaction_type IN ('INCOME', 'REFUND') THEN t.amount ELSE 0 END), 0)::FLOAT AS total_income,
        COALESCE(SUM(CASE WHEN t.transaction_type IN ('EXPENSE', 'FEE') THEN t.amount ELSE 0 END), 0)::FLOAT AS total_expense
      FROM household_members hm
      JOIN users u ON u.id = hm.user_id
      LEFT JOIN transactions t ON t.user_id = u.id AND ${where}
      WHERE hm.household_id = $1 AND hm.status = 'ACTIVE'
      GROUP BY u.id, u.name, u.email, u.avatar_url, hm.role
      ORDER BY total_expense DESC
    `;

    return QueryHelper.query(sql, params);
  }
}
