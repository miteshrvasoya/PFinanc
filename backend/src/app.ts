import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { householdRoutes } from './modules/households/households.routes.js';
import { accountRoutes } from './modules/accounts/accounts.routes.js';
import { transactionRoutes } from './modules/transactions/transactions.routes.js';
import { transferRoutes } from './modules/transfers/transfers.routes.js';
import { categoryRoutes } from './modules/categories/categories.routes.js';
import { importRoutes } from './modules/imports/imports.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { analyticsRoutes } from './modules/analytics/analytics.routes.js';
import { investmentsRouter } from './modules/investments/investments.routes.js';
import { onboardingRoutes } from './modules/onboarding/onboarding.routes.js';
import { classificationRoutes } from './modules/classification/classification.routes.js';
import { physicalAssetsRoutes } from './modules/physical-assets/physicalAssets.routes.js';
import { invitationsRoutes } from './modules/invitations/invitations.routes.js';
import { statementImportsRoutes } from './modules/statement-imports/statementImports.routes.js';

export const app = express();

// Middleware
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'pfinanc-backend-api',
  });
});

// Mount Module Routes
app.use('/api/auth', authRoutes);
app.use('/api/households', householdRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/imports', importRoutes);
app.use('/api/statement-imports', statementImportsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/investments', investmentsRouter);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/classification', classificationRoutes);
app.use('/api/physical-assets', physicalAssetsRoutes);
app.use('/api/invitations', invitationsRoutes);

// Error Handler
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  const PORT = config.port || 5000;
  app.listen(PORT, () => {
    console.log(`PFinanc Backend API server listening on http://localhost:${PORT}`);
  });
}
