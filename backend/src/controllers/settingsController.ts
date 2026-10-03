import { Request, Response, NextFunction } from 'express';
import { pharmacyStore } from '../services/pharmacyStore.js';

export function getSettings(req: Request, res: Response, next: NextFunction): void {
  try {
    const settings = pharmacyStore.getSettings();
    res.status(200).json({
      status: 'success',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
}

export function updateSettings(req: Request, res: Response, next: NextFunction): void {
  try {
    const { shopName, pharmacistName, nearExpiryDays } = req.body;

    const updated = pharmacyStore.updateSettings({
      shopName,
      pharmacistName,
      nearExpiryDays: nearExpiryDays !== undefined ? Number(nearExpiryDays) : undefined,
    });

    res.status(200).json({
      status: 'success',
      message: 'Shop settings updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}
