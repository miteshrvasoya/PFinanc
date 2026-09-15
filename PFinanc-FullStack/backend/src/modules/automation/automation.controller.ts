import { Request, Response } from 'express';
import { AutomationService } from './automation.service.js';

export class AutomationController {
  
  static async syncCandidates(req: Request, res: Response) {
    try {
      const { candidates } = req.body;
      const deviceId = req.headers['x-device-id'] as string;
      // @ts-ignore
      const userId = req.user.userId;
      // @ts-ignore
      const householdId = req.user.householdId;

      if (!deviceId) {
        return res.status(400).json({ error: 'Device ID required' });
      }

      const results = await AutomationService.syncCandidates(householdId, userId, deviceId, candidates);
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getCandidates(req: Request, res: Response) {
    try {
      // @ts-ignore
      const householdId = req.user.householdId;
      const candidates = await AutomationService.getCandidates(householdId);
      res.json(candidates);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async approveCandidate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      // @ts-ignore
      const userId = req.user.userId;
      // @ts-ignore
      const householdId = req.user.householdId;
      
      const transaction = await AutomationService.approveCandidate(id, householdId, userId, req.body);
      res.json({ success: true, transaction });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async rejectCandidate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      // @ts-ignore
      const householdId = req.user.householdId;
      
      await AutomationService.rejectCandidate(id, householdId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
