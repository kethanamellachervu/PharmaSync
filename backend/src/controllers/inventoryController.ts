import { Request, Response, NextFunction } from 'express';
import { pharmacyStore } from '../services/pharmacyStore.js';

export function getInventory(req: Request, res: Response, next: NextFunction): void {
  try {
    const medicines = pharmacyStore.getAllMedicines();
    res.status(200).json({
      status: 'success',
      data: medicines,
    });
  } catch (error) {
    next(error);
  }
}

export function addMedicine(req: Request, res: Response, next: NextFunction): void {
  try {
    const { name, category, price, minStock, batchNumber, quantity, expiryDate } = req.body;

    if (!name || price === undefined || minStock === undefined || quantity === undefined || !expiryDate) {
      res.status(400).json({
        status: 'error',
        message: 'Name, price, minimum stock, quantity, and expiry date are required.',
      });
      return;
    }

    const medicine = pharmacyStore.addMedicine({
      name,
      category: category || 'General',
      price: Number(price),
      minStock: Number(minStock),
      batchNumber: batchNumber || '',
      quantity: Number(quantity),
      expiryDate,
    });

    res.status(201).json({
      status: 'success',
      message: 'Medicine added successfully.',
      data: medicine,
    });
  } catch (error) {
    next(error);
  }
}

export function updateMedicine(req: Request, res: Response, next: NextFunction): void {
  try {
    const { id } = req.params;
    const { name, category, price, minStock, batches } = req.body;

    const updated = pharmacyStore.updateMedicine(id, {
      name,
      category,
      price: price !== undefined ? Number(price) : undefined,
      minStock: minStock !== undefined ? Number(minStock) : undefined,
      batches,
    });

    if (!updated) {
      res.status(404).json({
        status: 'error',
        message: 'Medicine not found.',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: 'Medicine updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export function deleteMedicine(req: Request, res: Response, next: NextFunction): void {
  try {
    const { id } = req.params;
    const deleted = pharmacyStore.deleteMedicine(id);

    if (!deleted) {
      res.status(404).json({
        status: 'error',
        message: 'Medicine not found.',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: 'Medicine deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
}

export function getDashboardOverview(req: Request, res: Response, next: NextFunction): void {
  try {
    const stats = pharmacyStore.getDashboardStats();
    res.status(200).json({
      status: 'success',
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}
