import { Request, Response, NextFunction } from 'express';
import { pharmacyStore } from '../services/pharmacyStore.js';

export async function getDashboardAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await pharmacyStore.getDashboardAnalytics();
    res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function getSalesAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const groupBy = (req.query.groupBy as 'day' | 'week' | 'month') || 'day';

    const data = await pharmacyStore.getSalesAnalytics({ startDate, endDate, groupBy });
    res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function getInventoryAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await pharmacyStore.getInventoryAnalytics();
    res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPurchasesAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const data = await pharmacyStore.getPurchaseAnalytics({ startDate, endDate });
    res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
}
