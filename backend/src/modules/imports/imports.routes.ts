import { Router } from 'express';
import multer from 'multer';
import { ImportsController } from './imports.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireHouseholdAccess } from '../../middleware/rbac.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

router.use(authenticate);
router.use(requireHouseholdAccess());

router.post('/preview', upload.single('file'), ImportsController.uploadAndPreview);
router.post('/commit/:batchId', ImportsController.commit);

export const importRoutes = router;
