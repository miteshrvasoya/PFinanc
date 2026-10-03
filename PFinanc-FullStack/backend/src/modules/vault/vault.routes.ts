import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { VaultController } from './vault.controller.js';

const router = Router();

// All vault routes require authentication
router.use(authenticate);

router.get('/', VaultController.getItems);
router.post('/', VaultController.createItem);
router.put('/:id', VaultController.updateItem);
router.delete('/:id', VaultController.deleteItem);

export default router;
