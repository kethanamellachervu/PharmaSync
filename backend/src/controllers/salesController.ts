import { Request, Response, NextFunction } from 'express';
import { pharmacyStore } from '../services/pharmacyStore.js';

export function getSales(req: Request, res: Response, next: NextFunction): void {
  try {
    const search = req.query.search as string | undefined;
    const date = req.query.date as string | undefined;

    const sales = pharmacyStore.getAllSales({ search, date });
    res.status(200).json({
      status: 'success',
      data: sales,
      total: sales.length,
    });
  } catch (error) {
    next(error);
  }
}

export function getSaleById(req: Request, res: Response, next: NextFunction): void {
  try {
    const { id } = req.params;
    const sale = pharmacyStore.getSaleById(id);

    if (!sale) {
      res.status(404).json({
        status: 'error',
        message: `Sale with ID or invoice number "${id}" not found.`,
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: sale,
    });
  } catch (error) {
    next(error);
  }
}

export function recordSale(req: Request, res: Response, next: NextFunction): void {
  try {
    const { items, medicineId, quantity, customerName, idempotencyKey } = req.body;

    // Multi-item sales support (Phase 3)
    if (items && Array.isArray(items)) {
      if (items.length === 0) {
        res.status(400).json({
          status: 'error',
          message: 'At least one medicine item is required for a sale.',
        });
        return;
      }

      const sale = pharmacyStore.createSale({
        customerName,
        items,
        idempotencyKey,
      });

      res.status(201).json({
        status: 'success',
        message: `Sale invoice ${sale.saleNumber} recorded and stock deducted using FEFO allocation.`,
        data: sale,
      });
      return;
    }

    // Single-item backward-compatible support (Phase 1 & 2)
    if (!medicineId || !quantity || Number(quantity) <= 0) {
      res.status(400).json({
        status: 'error',
        message: 'A valid medicineId and positive quantity or items array are required.',
      });
      return;
    }

    const result = pharmacyStore.recordSale(medicineId, Number(quantity));

    res.status(201).json({
      status: 'success',
      message: 'Sale recorded and stock updated using FEFO priority.',
      data: result,
    });
  } catch (error: unknown) {
    const err = error as Error;
    res.status(400).json({
      status: 'error',
      message: err.message || 'Failed to record sale.',
    });
  }
}
