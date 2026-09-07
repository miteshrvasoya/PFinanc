import { Router } from 'express';
import multer from 'multer';
import { StatementImportsController } from './statementImports.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireHouseholdAccess } from '../../middleware/rbac.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB limit
});

const router = Router();

router.use(authenticate);
router.use(requireHouseholdAccess());

// Phase A: Upload & deterministic parse
router.post('/upload', upload.single('file'), StatementImportsController.upload);

// Phase B: AI Analysis Trigger & Inspection
router.post('/:id/ai-run', StatementImportsController.startAiRun);
router.get('/:id', StatementImportsController.getImport);
router.get('/:id/parsed-rows', StatementImportsController.getParsedRows);
router.get('/:id/review', StatementImportsController.getReview);
router.post('/chunks/:chunkId/retry', StatementImportsController.retryChunk);

// Phase C: Final User Confirmation & Ledger Commitment
router.post('/:id/confirm', StatementImportsController.confirm);

export const statementImportsRoutes = router;
