import { Request, Response, NextFunction } from 'express';
import { pharmacyStore } from '../services/pharmacyStore.js';

export function getSales(req: Request, res: Response, next: NextFunction): void {
  try {
    const sales = pharmacyStore.getAllSales();
    res.status(200).json({
      status: 'success',
      data: sales,
    });
  } catch (error) {
    next(error);
  }
}

export function recordSale(req: Request, res: Response, next: NextFunction): void {
  try {
    const { medicineId, quantity } = req.body;

    if (!medicineId || !quantity || Number(quantity) <= 0) {
      res.status(400).json({
        status: 'error',
        message: 'A valid medicineId and positive quantity are required.',
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
