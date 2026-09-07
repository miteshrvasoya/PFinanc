import { Request, Response, NextFunction } from 'express';
import { MarketDataService } from './marketData.service.js';
import { getHouseholdId } from '../../../utils/request.js';

export class PricesController {
  static async refreshPrices(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const stats = await MarketDataService.refreshPrices(householdId || undefined);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  static async setPrice(req: Request, res: Response, next: NextFunction) {
    try {
      const { security_id, price, price_date } = req.body;
      if (!security_id || price === undefined || price <= 0) {
        res.status(400).json({ success: false, error: { code: 'INVALID_PRICE', message: 'Valid security_id and positive price are required' } });
        return;
      }
      await MarketDataService.setManualPrice(security_id, parseFloat(price), price_date);
      res.json({ success: true, message: 'Price updated successfully' });
    } catch (error) {
      next(error);
    }
  }
}
