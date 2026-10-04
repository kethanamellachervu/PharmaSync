import { Request, Response, NextFunction } from 'express';
import { pharmacyStore } from '../services/pharmacyStore.js';

function toCsv(rows: Record<string, unknown>[], headers: { key: string; label: string }[]): string {
  const headerLine = headers.map((h) => `"${h.label.replace(/"/g, '""')}"`).join(',');
  const lines = rows.map((row) =>
    headers
      .map((h) => {
        const val = row[h.key] !== undefined && row[h.key] !== null ? String(row[h.key]) : '';
        return `"${val.replace(/"/g, '""')}"`;
      })
      .join(',')
  );
  return [headerLine, ...lines].join('\r\n');
}

export async function getSalesReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const format = req.query.format as string | undefined;

    const rows = await pharmacyStore.getSalesReportData({ startDate, endDate });

    if (format === 'csv') {
      const headers = [
        { key: 'saleId', label: 'Sale ID' },
        { key: 'date', label: 'Date & Time' },
        { key: 'customer', label: 'Customer' },
        { key: 'numberOfItems', label: 'Number of Items' },
        { key: 'totalQuantity', label: 'Total Quantity' },
        { key: 'totalAmount', label: 'Total Amount (INR)' },
      ];
      const csv = toCsv(rows, headers);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="sales_report.csv"');
      res.status(200).send(csv);
      return;
    }

    res.status(200).json({
      status: 'success',
      total: rows.length,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
}

export async function getInventoryReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = req.query.category as string | undefined;
    const stockStatus = req.query.stockStatus as string | undefined;
    const format = req.query.format as string | undefined;

    const rows = await pharmacyStore.getInventoryReportData({ category, stockStatus });

    if (format === 'csv') {
      const headers = [
        { key: 'medicineName', label: 'Medicine Name' },
        { key: 'genericName', label: 'Generic Name' },
        { key: 'category', label: 'Category' },
        { key: 'unit', label: 'Unit' },
        { key: 'availableStock', label: 'Available Stock' },
        { key: 'minStockLevel', label: 'Minimum Stock' },
        { key: 'sellingPrice', label: 'Selling Price (INR)' },
        { key: 'stockStatus', label: 'Stock Status' },
      ];
      const csv = toCsv(rows, headers);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="inventory_report.csv"');
      res.status(200).send(csv);
      return;
    }

    res.status(200).json({
      status: 'success',
      total: rows.length,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
}

export async function getExpiryReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const status = req.query.status as 'all' | 'near_expiry' | 'expired' | undefined;
    const format = req.query.format as string | undefined;

    const rows = await pharmacyStore.getExpiryReportData(status);

    if (format === 'csv') {
      const headers = [
        { key: 'medicineName', label: 'Medicine Name' },
        { key: 'category', label: 'Category' },
        { key: 'batchNumber', label: 'Batch Number' },
        { key: 'batchQuantity', label: 'Batch Quantity' },
        { key: 'expiryDate', label: 'Expiry Date' },
        { key: 'daysRemaining', label: 'Days Remaining' },
        { key: 'expiryStatus', label: 'Expiry Status' },
      ];
      const csv = toCsv(rows, headers);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="expiry_report.csv"');
      res.status(200).send(csv);
      return;
    }

    res.status(200).json({
      status: 'success',
      total: rows.length,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPurchasesReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const supplierId = req.query.supplierId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const format = req.query.format as string | undefined;

    const rows = await pharmacyStore.getPurchaseReportData({ supplierId, startDate, endDate });

    if (format === 'csv') {
      const headers = [
        { key: 'purchaseId', label: 'Purchase ID' },
        { key: 'supplierName', label: 'Supplier Name' },
        { key: 'date', label: 'Purchase Date' },
        { key: 'numberOfItems', label: 'Number of Items' },
        { key: 'totalQuantity', label: 'Total Quantity' },
        { key: 'totalAmount', label: 'Total Amount (INR)' },
      ];
      const csv = toCsv(rows, headers);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="purchases_report.csv"');
      res.status(200).send(csv);
      return;
    }

    res.status(200).json({
      status: 'success',
      total: rows.length,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
}
