import { Request, Response, NextFunction } from 'express';
import { pharmacyStore } from '../services/pharmacyStore.js';

export async function getPurchases(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const supplierId = req.query.supplierId as string | undefined;
    const date = req.query.date as string | undefined;

    const purchases = await pharmacyStore.getAllPurchases({ supplierId, date });
    res.status(200).json({
      status: 'success',
      data: purchases,
      total: purchases.length,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPurchaseById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const purchase = await pharmacyStore.getPurchaseById(id);

    if (!purchase) {
      res.status(404).json({
        status: 'error',
        message: `Purchase order with ID or number "${id}" not found.`,
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: purchase,
    });
  } catch (error) {
    next(error);
  }
}

export async function createPurchase(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { supplierId, items, notes } = req.body;

    if (!supplierId) {
      res.status(400).json({
        status: 'error',
        message: 'A supplier must be selected for the purchase.',
      });
      return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'At least one medicine item must be added to the purchase order.',
      });
      return;
    }

    const purchase = await pharmacyStore.createPurchase({
      supplierId,
      items,
      notes,
    });

    res.status(201).json({
      status: 'success',
      message: `Purchase Order ${purchase.purchaseNumber} recorded successfully. Stock batches and inventory updated.`,
      data: purchase,
    });
  } catch (error: unknown) {
    const err = error as Error;
    res.status(400).json({
      status: 'error',
      message: err.message || 'Failed to record purchase.',
    });
  }
}
