import { Request, Response, NextFunction } from 'express';
import { pharmacyStore } from '../services/pharmacyStore.js';

export async function getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const settings = await pharmacyStore.getSettings();
    res.status(200).json({
      status: 'success',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { shopName, pharmacistName, nearExpiryDays } = req.body;

    const updated = await pharmacyStore.updateSettings({
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
