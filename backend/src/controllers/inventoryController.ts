import { Request, Response, NextFunction } from 'express';
import { pharmacyStore } from '../services/pharmacyStore.js';
import { testSupabaseConnection } from '../config/supabase.js';
import { envConfig } from '../config/env.js';

// 1. List all medicines
export async function getInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const medicines = await pharmacyStore.getAllMedicines();
    res.status(200).json({
      status: 'success',
      count: medicines.length,
      data: medicines,
    });
  } catch (error) {
    next(error);
  }
}

// 2. Fetch single medicine details
export async function getMedicineById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const medicine = await pharmacyStore.getMedicineById(id);

    if (!medicine) {
      res.status(404).json({
        status: 'error',
        message: 'Medicine not found in inventory.',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: medicine,
    });
  } catch (error) {
    next(error);
  }
}

// 3. Create a new medicine
export async function addMedicine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      name,
      genericName,
      category,
      manufacturer,
      description,
      unit,
      minStockLevel,
      sellingPrice,
      purchasePrice,
      batchNumber,
      quantity,
      mfgDate,
      expiryDate,
    } = req.body;

    // Field validations
    if (!name || !name.trim()) {
      res.status(400).json({ status: 'error', message: 'Medicine name is required.' });
      return;
    }
    if (!category || !category.trim()) {
      res.status(400).json({ status: 'error', message: 'Category is required.' });
      return;
    }
    if (sellingPrice === undefined || Number(sellingPrice) <= 0) {
      res.status(400).json({ status: 'error', message: 'Selling price must be greater than zero.' });
      return;
    }
    if (minStockLevel === undefined || Number(minStockLevel) < 0) {
      res.status(400).json({ status: 'error', message: 'Minimum stock level must be non-negative.' });
      return;
    }
    if (quantity === undefined || Number(quantity) < 0) {
      res.status(400).json({ status: 'error', message: 'Initial quantity must be non-negative.' });
      return;
    }
    if (!batchNumber || !batchNumber.trim()) {
      res.status(400).json({ status: 'error', message: 'Batch number is required for the initial batch.' });
      return;
    }
    if (!expiryDate) {
      res.status(400).json({ status: 'error', message: 'Expiry date is required.' });
      return;
    }
    if (mfgDate && new Date(expiryDate) <= new Date(mfgDate)) {
      res.status(400).json({
        status: 'error',
        message: 'Expiry date must be later than the manufacturing date.',
      });
      return;
    }

    const created = await pharmacyStore.addMedicine({
      name,
      genericName,
      category,
      manufacturer,
      description,
      unit: unit || 'tablets',
      minStockLevel: Number(minStockLevel),
      sellingPrice: Number(sellingPrice),
      purchasePrice: purchasePrice !== undefined && purchasePrice !== '' ? Number(purchasePrice) : undefined,
      batchNumber,
      quantity: Number(quantity),
      mfgDate,
      expiryDate,
    });

    res.status(201).json({
      status: 'success',
      message: 'Medicine and initial batch added to inventory successfully.',
      data: created,
    });
  } catch (error: unknown) {
    const err = error as Error;
    res.status(400).json({
      status: 'error',
      message: err.message || 'Failed to add medicine.',
    });
  }
}

// 4. Update medicine details
export async function updateMedicine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const {
      name,
      genericName,
      category,
      manufacturer,
      description,
      unit,
      minStockLevel,
      sellingPrice,
      purchasePrice,
    } = req.body;

    if (sellingPrice !== undefined && Number(sellingPrice) <= 0) {
      res.status(400).json({ status: 'error', message: 'Selling price must be greater than zero.' });
      return;
    }
    if (minStockLevel !== undefined && Number(minStockLevel) < 0) {
      res.status(400).json({ status: 'error', message: 'Minimum stock level must be non-negative.' });
      return;
    }

    const updated = await pharmacyStore.updateMedicine(id, {
      name,
      genericName,
      category,
      manufacturer,
      description,
      unit,
      minStockLevel: minStockLevel !== undefined ? Number(minStockLevel) : undefined,
      sellingPrice: sellingPrice !== undefined ? Number(sellingPrice) : undefined,
      purchasePrice: purchasePrice !== undefined && purchasePrice !== '' ? Number(purchasePrice) : undefined,
    });

    if (!updated) {
      res.status(404).json({ status: 'error', message: 'Medicine not found.' });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: 'Medicine updated successfully.',
      data: updated,
    });
  } catch (error: unknown) {
    const err = error as Error;
    res.status(400).json({ status: 'error', message: err.message || 'Failed to update medicine.' });
  }
}

// 5. Delete a medicine
export async function deleteMedicine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const deleted = await pharmacyStore.deleteMedicine(id);

    if (!deleted) {
      res.status(404).json({ status: 'error', message: 'Medicine not found.' });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: 'Medicine and associated batches deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
}

// 6. List batches for a medicine
export async function getBatches(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const medicine = await pharmacyStore.getMedicineById(id);

    if (!medicine) {
      res.status(404).json({ status: 'error', message: 'Medicine not found.' });
      return;
    }

    const batches = await pharmacyStore.getBatches(id);
    res.status(200).json({
      status: 'success',
      data: batches,
    });
  } catch (error) {
    next(error);
  }
}

// 7. Add a new batch to an existing medicine
export async function addBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { batchNumber, quantity, mfgDate, expiryDate, reason } = req.body;

    if (!batchNumber || !batchNumber.trim()) {
      res.status(400).json({ status: 'error', message: 'Batch number is required.' });
      return;
    }
    if (quantity === undefined || Number(quantity) < 0) {
      res.status(400).json({ status: 'error', message: 'Quantity must be non-negative.' });
      return;
    }
    if (!expiryDate) {
      res.status(400).json({ status: 'error', message: 'Expiry date is required.' });
      return;
    }
    if (mfgDate && new Date(expiryDate) <= new Date(mfgDate)) {
      res.status(400).json({
        status: 'error',
        message: 'Expiry date must be later than the manufacturing date.',
      });
      return;
    }

    const newBatch = await pharmacyStore.addBatch(id, {
      batchNumber,
      quantity: Number(quantity),
      mfgDate,
      expiryDate,
      reason,
    });

    const updatedMedicine = await pharmacyStore.getMedicineById(id);

    res.status(201).json({
      status: 'success',
      message: `Batch "${batchNumber}" added to medicine successfully.`,
      data: {
        batch: newBatch,
        medicine: updatedMedicine,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    res.status(400).json({
      status: 'error',
      message: err.message || 'Failed to add batch.',
    });
  }
}

// 8. Update batch information / adjust quantity
export async function updateBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id, batchId } = req.params;
    const { batchNumber, quantity, mfgDate, expiryDate, reason } = req.body;

    if (quantity !== undefined && Number(quantity) < 0) {
      res.status(400).json({ status: 'error', message: 'Quantity must be non-negative.' });
      return;
    }
    if (mfgDate && expiryDate && new Date(expiryDate) <= new Date(mfgDate)) {
      res.status(400).json({
        status: 'error',
        message: 'Expiry date must be later than the manufacturing date.',
      });
      return;
    }

    const updated = await pharmacyStore.updateBatch(id, batchId, {
      batchNumber,
      quantity: quantity !== undefined ? Number(quantity) : undefined,
      mfgDate,
      expiryDate,
      reason,
    });

    if (!updated) {
      res.status(404).json({ status: 'error', message: 'Batch not found for this medicine.' });
      return;
    }

    const updatedMedicine = await pharmacyStore.getMedicineById(id);

    res.status(200).json({
      status: 'success',
      message: 'Batch updated successfully.',
      data: {
        batch: updated,
        medicine: updatedMedicine,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    res.status(400).json({
      status: 'error',
      message: err.message || 'Failed to update batch.',
    });
  }
}

// 9. View stock movement history
export async function getStockMovements(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const limit = req.query.limit ? Number(req.query.limit) : 50;

    const movements = await pharmacyStore.getStockMovements(id, limit);
    res.status(200).json({
      status: 'success',
      data: movements,
    });
  } catch (error) {
    next(error);
  }
}

// 10. View inventory alerts
export async function getInventoryAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const alerts = await pharmacyStore.getInventoryAlerts();
    res.status(200).json({
      status: 'success',
      data: alerts,
    });
  } catch (error) {
    next(error);
  }
}

// 11. Reusable FEFO stock allocation
export async function allocateFefoStock(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { medicineId, quantity, reason } = req.body;

    if (!medicineId) {
      res.status(400).json({ status: 'error', message: 'medicineId is required.' });
      return;
    }
    if (!quantity || Number(quantity) <= 0) {
      res.status(400).json({ status: 'error', message: 'Quantity must be greater than zero.' });
      return;
    }

    const result = await pharmacyStore.allocateFefo(medicineId, Number(quantity), reason);

    if (!result.success) {
      res.status(400).json({
        status: 'error',
        message: result.error || 'FEFO stock allocation failed.',
        data: result,
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: `Allocated ${quantity} units using FEFO priority.`,
      data: result,
    });
  } catch (error: unknown) {
    const err = error as Error;
    res.status(400).json({
      status: 'error',
      message: err.message || 'Allocation failed.',
    });
  }
}

// 12. Supabase Database Status check
export async function getDatabaseStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const status = await testSupabaseConnection();
    res.status(200).json({
      status: 'success',
      data: {
        isConfigured: envConfig.isSupabaseConfigured,
        isConnected: status.isConnected,
        message: status.message,
        latencyMs: status.latencyMs,
      },
    });
  } catch (error) {
    next(error);
  }
}

// 13. Dashboard overview
export async function getDashboardOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const enriched = await pharmacyStore.getAllMedicines();
    const alerts = await pharmacyStore.getInventoryAlerts();
    const settings = await pharmacyStore.getSettings();
    const suppliers = await pharmacyStore.getAllSuppliers();
    const purchases = await pharmacyStore.getAllPurchases();

    const totalMedicines = enriched.length;
    const availableStock = enriched.reduce((sum, m) => sum + m.usableStock, 0);
    const todaySalesAmount = await pharmacyStore.getTodaySalesAmount();
    const todayPurchaseAmount = await pharmacyStore.getTodayPurchaseAmount();
    const monthSalesAmount = await pharmacyStore.getMonthSalesAmount();
    const salesTrend7Days = await pharmacyStore.getRecentSalesTrend(7);
    const categoryDistribution = await pharmacyStore.getCategoryDistribution();
    const recentSales = (await pharmacyStore.getAllSales()).slice(0, 5);

    const totalSuppliers = suppliers.length;
    const activeSuppliers = suppliers.filter((s) => s.status !== 'Inactive').length;
    const pendingPurchaseOrders = purchases.filter((p) => p.status === 'pending').length;
    const totalPurchases = purchases.length;
    const totalPurchaseAmount = purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);

    res.status(200).json({
      status: 'success',
      data: {
        totalMedicines,
        availableStock,
        lowStockCount: alerts.summary.lowStockCount,
        outOfStockCount: alerts.summary.outOfStockCount,
        nearExpiryBatchCount: alerts.summary.nearExpiryBatchCount,
        expiredBatchCount: alerts.summary.expiredBatchCount,
        todaySalesAmount,
        todayPurchaseAmount,
        monthSalesAmount,
        salesTrend7Days,
        categoryDistribution,
        totalSuppliers,
        activeSuppliers,
        pendingPurchaseOrders,
        totalPurchases,
        totalPurchaseAmount,
        lowStockMedicines: alerts.lowStockMedicines.map((m) => ({
          id: m.id,
          name: m.name,
          category: m.category,
          totalStock: m.usableStock,
          minStock: m.minStockLevel,
          unit: m.unit,
        })),
        nearExpiryMedicines: alerts.nearExpiryBatches,
        expiredMedicines: alerts.expiredBatches,
        recentSales,
        settings,
      },
    });
  } catch (error) {
    next(error);
  }
}
