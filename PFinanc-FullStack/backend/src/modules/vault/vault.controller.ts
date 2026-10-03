import { Request, Response, NextFunction } from 'express';
import { VaultService } from './vault.service.js';

export class VaultController {
  
  // Get all vault items for the authenticated user
  static async getItems(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const items = await VaultService.getItems(userId);
      res.json({ success: true, data: items });
    } catch (error) {
      next(error);
    }
  }

  // Create a new vault item
  static async createItem(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { category, encryptedData, iv, authTag, isShared, household } = req.body;

      if (!encryptedData || !iv || !authTag) {
        return res.status(400).json({ success: false, message: 'Missing encryption payload fields.' });
      }

      const newItem = await VaultService.createItem(userId, {
        category,
        household_id: household,
        is_shared: isShared,
        encrypted_data: encryptedData,
        iv,
        auth_tag: authTag,
      });

      res.status(201).json({ success: true, data: newItem });
    } catch (error) {
      next(error);
    }
  }

  // Update a vault item
  static async updateItem(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const id = req.params.id as string;
      const { category, encryptedData, iv, authTag, isShared } = req.body;

      const updated = await VaultService.updateItem(userId, id, {
        category,
        encrypted_data: encryptedData,
        iv,
        auth_tag: authTag,
        is_shared: isShared,
      });

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Vault item not found.' });
      }

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  // Delete a vault item
  static async deleteItem(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const id = req.params.id as string;

      const deleted = await VaultService.deleteItem(userId, id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Vault item not found.' });
      }

      res.json({ success: true, message: 'Item securely deleted from vault.' });
    } catch (error) {
      next(error);
    }
  }
}
