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

export const investmentsRouter = Router();

// Apply auth and household membership middleware to all investment routes
investmentsRouter.use(authenticate, requireHouseholdAccess());

// 1. Securities
investmentsRouter.get('/securities/search', SecuritiesController.search);
investmentsRouter.get('/securities', SecuritiesController.list);
investmentsRouter.get('/securities/:id', SecuritiesController.getById);
investmentsRouter.post('/securities', SecuritiesController.create);

// 2. Portfolio & Holdings
investmentsRouter.get('/portfolio', PortfolioController.getSummary);
investmentsRouter.get('/portfolio/holdings', PortfolioController.getHoldings);
investmentsRouter.get('/portfolio/snapshots', PortfolioController.getSnapshots);

// 3. Investment Transactions
investmentsRouter.get('/transactions', InvestmentTransactionsController.list);
investmentsRouter.post('/transactions', InvestmentTransactionsController.create);
investmentsRouter.get('/transactions/:id', InvestmentTransactionsController.getById);
investmentsRouter.post('/transactions/:id/void', InvestmentTransactionsController.void);

// 4. Market Prices
investmentsRouter.post('/prices/refresh', PricesController.refreshPrices);
investmentsRouter.post('/prices/set', PricesController.setPrice);

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
investmentsRouter.post('/imports/preview', InvestmentImportsController.preview);
investmentsRouter.post('/imports/:id/commit', InvestmentImportsController.commit);
