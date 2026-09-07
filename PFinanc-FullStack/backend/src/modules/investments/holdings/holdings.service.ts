import { QueryHelper } from '../../../database/queryHelper.js';

export interface BuyLot {
  date: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface SecurityHolding {
  security_id: string;
  symbol: string;
  isin: string | null;
  name: string;
  security_type: string;
  asset_class: string;
  exchange: string;
  current_quantity: number;
  average_cost: number;
  total_invested: number;
  current_price: number;
  price_date: string | null;
  is_stale: boolean;
  current_value: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
  realized_pnl: number;
  total_dividends: number;
  account_id?: string;
  account_name?: string;
  owner_name?: string;
  lots?: BuyLot[];
  snapshot_reconciliation?: boolean;
  as_of_date?: string;
  snapshot?: SecurityHolding;
}

export class HoldingsService {
  /**
   * Replay investment transactions with FIFO lot-depletion to calculate holding positions & P&L
   */
  static async calculateHoldings(filter: {
    householdId: string;
    userId?: string;
    accountId?: string;
    securityId?: string;
  }): Promise<SecurityHolding[]> {
    const conditions = ['it.household_id = $1', 'it.status = \'CONFIRMED\''];
    const params: any[] = [filter.householdId];

    if (filter.accountId) {
      params.push(filter.accountId);
      conditions.push(`it.investment_account_id = $${params.length}`);
    }

    if (filter.securityId) {
      params.push(filter.securityId);
      conditions.push(`it.security_id = $${params.length}`);
    }

    const whereClause = conditions.join(' AND ');

    // Fetch transactions in strict chronological execution order
    const sql = `
      SELECT 
        it.id,
        it.investment_account_id,
        a.name AS account_name,
        a.owner_user_id,
        u.name AS owner_name,
        it.security_id,
        s.symbol,
        s.isin,
        s.name AS security_name,
        s.security_type,
        s.asset_class,
        s.exchange,
        it.transaction_type,
        it.transaction_date,
        CAST(it.quantity AS FLOAT) AS quantity,
        CAST(it.price_per_unit AS FLOAT) AS price_per_unit,
        CAST(it.gross_amount AS FLOAT) AS gross_amount,
        CAST(it.fees AS FLOAT) AS fees,
        CAST(it.taxes AS FLOAT) AS taxes,
        CAST(it.net_amount AS FLOAT) AS net_amount,
        CAST(p.close AS FLOAT) AS latest_price,
        p.price_date,
        COALESCE(p.is_stale, false) AS is_stale
      FROM investment_transactions it
      JOIN accounts a ON a.id = it.investment_account_id
      JOIN users u ON u.id = a.owner_user_id
      LEFT JOIN securities s ON s.id = it.security_id
      LEFT JOIN LATERAL (
        SELECT close, price_date, is_stale
        FROM security_prices sp
        WHERE sp.security_id = s.id
        ORDER BY price_date DESC
        LIMIT 1
      ) p ON true
      WHERE ${whereClause}
      ORDER BY it.transaction_date ASC, it.created_at ASC
    `;

    const rawTxns = await QueryHelper.query(sql, params);

    // Group transactions by (security_id, account_id)
    const positionMap = new Map<string, {
      meta: any;
      lots: BuyLot[];
      realizedPnL: number;
      totalDividends: number;
    }>();

    for (const tx of rawTxns) {
      if (!tx.security_id) continue;
      const key = `${tx.security_id}_${tx.investment_account_id}`;

      if (!positionMap.has(key)) {
        positionMap.set(key, {
          meta: tx,
          lots: [],
          realizedPnL: 0,
          totalDividends: 0,
        });
      }

      const pos = positionMap.get(key)!;
      const qty = tx.quantity || 0;

      if (tx.transaction_type === 'BUY' || tx.transaction_type === 'SIP') {
        const effectiveUnitCost = qty > 0 ? (tx.net_amount / qty) : (tx.price_per_unit || 0);
        pos.lots.push({
          date: tx.transaction_date,
          quantity: qty,
          unitCost: effectiveUnitCost,
          totalCost: qty * effectiveUnitCost,
        });
      } else if (tx.transaction_type === 'BONUS') {
        pos.lots.push({
          date: tx.transaction_date,
          quantity: qty,
          unitCost: 0,
          totalCost: 0,
        });
      } else if (tx.transaction_type === 'SPLIT') {
        const totalOldQty = pos.lots.reduce((acc, l) => acc + l.quantity, 0);
        if (totalOldQty > 0 && qty > 0) {
          const ratio = (totalOldQty + qty) / totalOldQty;
          pos.lots.forEach((lot) => {
            lot.quantity = lot.quantity * ratio;
            lot.unitCost = lot.unitCost / ratio;
          });
        }
      } else if (tx.transaction_type === 'SELL' || tx.transaction_type === 'REDEMPTION') {
        let remainingToSell = qty;
        let totalCostOfSoldUnits = 0;

        while (remainingToSell > 0.00000001 && pos.lots.length > 0) {
          const oldestLot = pos.lots[0];
          if (oldestLot.quantity <= remainingToSell) {
            totalCostOfSoldUnits += oldestLot.quantity * oldestLot.unitCost;
            remainingToSell -= oldestLot.quantity;
            pos.lots.shift(); // fully consumed lot
          } else {
            totalCostOfSoldUnits += remainingToSell * oldestLot.unitCost;
            oldestLot.quantity -= remainingToSell;
            oldestLot.totalCost = oldestLot.quantity * oldestLot.unitCost;
            remainingToSell = 0;
          }
        }

        const netSaleProceeds = tx.net_amount; // gross - fees - taxes
        const saleRealized = netSaleProceeds - totalCostOfSoldUnits;
        pos.realizedPnL += saleRealized;
      } else if (tx.transaction_type === 'DIVIDEND' || tx.transaction_type === 'INTEREST') {
        pos.totalDividends += tx.net_amount;
      }
    }

    const holdings: SecurityHolding[] = [];

    positionMap.forEach((pos) => {
      const currentQty = pos.lots.reduce((acc, l) => acc + l.quantity, 0);
      const totalInvested = pos.lots.reduce((acc, l) => acc + (l.quantity * l.unitCost), 0);
      const avgCost = currentQty > 0.00000001 ? (totalInvested / currentQty) : 0;
      const currentPrice = pos.meta.latest_price || avgCost;
      const currentValue = currentQty * currentPrice;
      const unrealizedPnL = currentValue - totalInvested;
      const unrealizedPnLPercent = totalInvested > 0 ? (unrealizedPnL / totalInvested) * 100 : 0;

      // Include holding if user currently owns quantity > 0 or has realized P&L / dividends
      if (currentQty > 0.00000001 || Math.abs(pos.realizedPnL) > 0.01 || pos.totalDividends > 0) {
        holdings.push({
          security_id: pos.meta.security_id,
          symbol: pos.meta.symbol,
          isin: pos.meta.isin,
          name: pos.meta.security_name,
          security_type: pos.meta.security_type,
          asset_class: pos.meta.asset_class,
          exchange: pos.meta.exchange,
          current_quantity: currentQty,
          average_cost: avgCost,
          total_invested: totalInvested,
          current_price: currentPrice,
          price_date: pos.meta.price_date,
          is_stale: pos.meta.is_stale,
          current_value: currentValue,
          unrealized_pnl: unrealizedPnL,
          unrealized_pnl_percent: unrealizedPnLPercent,
          realized_pnl: pos.realizedPnL,
          total_dividends: pos.totalDividends,
          account_id: pos.meta.investment_account_id,
          account_name: pos.meta.account_name,
          owner_name: pos.meta.owner_name,
          lots: pos.lots,
        });
      }
    });

    const snapshotConditions = ['ih.family_id = $1'];
    const snapshotParams: any[] = [filter.householdId];

    if (filter.accountId) {
      snapshotParams.push(filter.accountId);
      snapshotConditions.push(`ih.investment_account_id = $${snapshotParams.length}`);
    }

    if (filter.securityId) {
      snapshotParams.push(filter.securityId);
      snapshotConditions.push(`ih.instrument_id = $${snapshotParams.length}`);
    }

    const snapshotWhereClause = snapshotConditions.join(' AND ');

    // Fetch the latest holding snapshots per instrument/account
    const snapshotSql = `
      WITH RankedSnapshots AS (
        SELECT 
          ih.*,
          a.name AS account_name,
          a.owner_user_id,
          u.name AS owner_name,
          s.symbol,
          s.isin,
          s.name AS security_name,
          s.security_type,
          s.asset_class,
          s.exchange,
          CAST(p.close AS FLOAT) AS latest_price,
          p.price_date,
          COALESCE(p.is_stale, false) AS is_stale,
          ROW_NUMBER() OVER(PARTITION BY ih.instrument_id, ih.investment_account_id ORDER BY ih.as_of_date DESC) as rnk
        FROM investment_holdings ih
        JOIN accounts a ON a.id = ih.investment_account_id
        JOIN users u ON u.id = a.owner_user_id
        JOIN securities s ON s.id = ih.instrument_id
        LEFT JOIN LATERAL (
          SELECT close, price_date, is_stale
          FROM security_prices sp
          WHERE sp.security_id = s.id
          ORDER BY price_date DESC
          LIMIT 1
        ) p ON true
        WHERE ${snapshotWhereClause}
      )
      SELECT * FROM RankedSnapshots WHERE rnk = 1
    `;

    const rawSnapshots = await QueryHelper.query(snapshotSql, snapshotParams);

    // Merge snapshots into holdings
    // If a position exists from transactions, we flag it for reconciliation.
    // If it only exists as a snapshot, we add it.
    for (const snap of rawSnapshots) {
      const key = `${snap.instrument_id}_${snap.investment_account_id}`;
      
      const currentPrice = snap.latest_price || parseFloat(snap.current_price) || parseFloat(snap.average_cost);
      const currentValue = parseFloat(snap.quantity) * currentPrice;
      const totalInvested = parseFloat(snap.quantity) * parseFloat(snap.average_cost || 0);
      const unrealizedPnL = currentValue - totalInvested;
      const unrealizedPnLPercent = totalInvested > 0 ? (unrealizedPnL / totalInvested) * 100 : 0;
      
      const snapHolding: SecurityHolding = {
        security_id: snap.instrument_id,
        symbol: snap.symbol,
        isin: snap.isin,
        name: snap.security_name,
        security_type: snap.security_type,
        asset_class: snap.asset_class,
        exchange: snap.exchange,
        current_quantity: parseFloat(snap.quantity),
        average_cost: parseFloat(snap.average_cost || 0),
        total_invested: totalInvested,
        current_price: currentPrice,
        price_date: snap.price_date,
        is_stale: snap.is_stale,
        current_value: currentValue,
        unrealized_pnl: unrealizedPnL,
        unrealized_pnl_percent: unrealizedPnLPercent,
        realized_pnl: 0,
        total_dividends: 0,
        account_id: snap.investment_account_id,
        account_name: snap.account_name,
        owner_name: snap.owner_name,
        lots: [],
        snapshot_reconciliation: true, // Flag to UI
        as_of_date: snap.as_of_date
      };

      const existingIndex = holdings.findIndex(h => h.security_id === snap.instrument_id && h.account_id === snap.investment_account_id);
      
      if (existingIndex >= 0) {
        // Both transaction history and holding snapshot exist!
        // We attach the snapshot data for UI reconciliation purposes
        (holdings[existingIndex] as any).snapshot = snapHolding;
      } else {
        // Only holding snapshot exists, append to portfolio
        holdings.push(snapHolding);
      }
    }

    return holdings.sort((a, b) => b.current_value - a.current_value);
  }
}
