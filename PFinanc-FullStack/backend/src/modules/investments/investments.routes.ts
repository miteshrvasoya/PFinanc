import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireHouseholdAccess } from '../../middleware/rbac.js';
import { SecuritiesController } from './securities/securities.controller.js';
import { PortfolioController } from './portfolio/portfolio.controller.js';
import { InvestmentTransactionsController } from './transactions/investmentTransactions.controller.js';
import { PricesController } from './prices/prices.controller.js';
import { FixedDepositsController } from './fixed-deposits/fixedDeposits.controller.js';
import { RetirementController } from './retirement/retirement.controller.js';
import { InvestmentImportsController } from './imports/investmentImports.controller.js';
import { PriceChartService } from './charts/priceChart.service.js';
import { getHouseholdId } from '../../utils/request.js';

export const investmentsRouter = Router();

// Apply auth and household membership middleware to all investment routes
investmentsRouter.use(authenticate, requireHouseholdAccess());

// 1. Securities
investmentsRouter.get('/securities/search', SecuritiesController.search);
investmentsRouter.get('/securities', SecuritiesController.list);
investmentsRouter.get('/securities/:id', SecuritiesController.getById);
investmentsRouter.post('/securities', SecuritiesController.create);

// 2. Portfolio & Holdings
// Price history for a holding: ?range=1D|1W|1M|3M|6M|1Y|SINCE_BUY (default 1D) &view=personal|household
investmentsRouter.get('/chart/:symbol', async (req, res, next) => {
  try {
    const data = await PriceChartService.getChart({
      householdId: getHouseholdId(req), userId: req.user!.id, symbol: String(req.params.symbol),
      range: req.query.range as string | undefined, personal: req.query.view !== 'household',
    });
    res.json({ success: true, data });
  } catch (err: any) {
    if (err?.status) return res.status(err.status).json({ success: false, error: { code: err.code || 'CHART_ERROR', message: err.message } });
    next(err);
  }
});

// Remember when you bought a holding that has no trade history (used by "since I bought")
investmentsRouter.put('/holdings/:symbol/buy-date', async (req, res, next) => {
  try {
    const data = await PriceChartService.setBuyDate(getHouseholdId(req), req.user!.id, String(req.params.symbol), String(req.body?.date || ''));
    res.json({ success: true, data });
  } catch (err: any) {
    if (err?.status) return res.status(err.status).json({ success: false, error: { code: err.code || 'BUY_DATE_ERROR', message: err.message } });
    next(err);
  }
});
investmentsRouter.delete('/holdings/:symbol/buy-date', async (req, res, next) => {
  try {
    await PriceChartService.clearBuyDate(getHouseholdId(req), req.user!.id, String(req.params.symbol));
    res.json({ success: true });
  } catch (err: any) {
    if (err?.status) return res.status(err.status).json({ success: false, error: { code: err.code || 'BUY_DATE_ERROR', message: err.message } });
    next(err);
  }
});

investmentsRouter.get('/portfolio', PortfolioController.getSummary);
investmentsRouter.get('/portfolio/holdings', PortfolioController.getHoldings);
investmentsRouter.get('/portfolio/snapshots', PortfolioController.getSnapshots);
investmentsRouter.post('/portfolio/snapshots', PortfolioController.addSnapshot);
// 3. Investment Transactions
investmentsRouter.get('/transactions', InvestmentTransactionsController.list);
investmentsRouter.post('/transactions', InvestmentTransactionsController.create);
investmentsRouter.get('/transactions/:id', InvestmentTransactionsController.getById);
investmentsRouter.post('/transactions/:id/void', InvestmentTransactionsController.void);

// 4. Market Prices
investmentsRouter.post('/prices/refresh', PricesController.refreshPrices);
// Prices are shared by every household, so manual overrides are limited to owners/admins.
investmentsRouter.post('/prices/set', requireHouseholdAccess(['OWNER', 'ADMIN']), PricesController.setPrice);

// 5. Fixed Deposits
investmentsRouter.get('/fixed-deposits', FixedDepositsController.list);
investmentsRouter.post('/fixed-deposits', FixedDepositsController.create);
investmentsRouter.patch('/fixed-deposits/:id', FixedDepositsController.update);

// 6. Retirement (EPF, PPF, NPS)
investmentsRouter.get('/retirement', RetirementController.listAccounts);
investmentsRouter.post('/retirement', RetirementController.createAccount);
investmentsRouter.get('/retirement/:id/contributions', RetirementController.getContributions);
investmentsRouter.post('/retirement/contributions', RetirementController.addContribution);

// 7. Statement Imports
investmentsRouter.post('/imports', InvestmentImportsController.upload);
investmentsRouter.post('/imports/:id/parse', InvestmentImportsController.parse);
investmentsRouter.get('/imports/:id/preview', InvestmentImportsController.preview);
investmentsRouter.post('/imports/:id/commit', InvestmentImportsController.commit);
