import { Request, Response, NextFunction } from 'express';
import { pharmacyStore } from '../services/pharmacyStore.js';

export function getSuppliers(req: Request, res: Response, next: NextFunction): void {
  try {
    const search = req.query.search as string | undefined;
    const suppliers = pharmacyStore.getAllSuppliers(search);
    res.status(200).json({
      status: 'success',
      data: suppliers,
      total: suppliers.length,
    });
  } catch (error) {
    next(error);
  }
}

export function getSupplierById(req: Request, res: Response, next: NextFunction): void {
  try {
    const { id } = req.params;
    const supplier = pharmacyStore.getSupplierById(id);
    if (!supplier) {
      res.status(404).json({
        status: 'error',
        message: `Supplier with ID "${id}" not found.`,
      });
      return;
    }

    // Attach purchase records associated with this supplier for quick view
    const purchases = pharmacyStore.getAllPurchases({ supplierId: id });

    res.status(200).json({
      status: 'success',
      data: {
        ...supplier,
        purchases,
      },
    });
  } catch (error) {
    next(error);
  }
}

export function createSupplier(req: Request, res: Response, next: NextFunction): void {
  try {
    const { name, contactPerson, phone, email, address } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({
        status: 'error',
        message: 'Supplier name is required.',
      });
      return;
    }

    if (!phone || !phone.trim()) {
      res.status(400).json({
        status: 'error',
        message: 'Contact phone number is required.',
      });
      return;
    }

    const supplier = pharmacyStore.addSupplier({
      name,
      contactPerson,
      phone,
      email,
      address,
    });

    res.status(201).json({
      status: 'success',
      message: `Supplier "${supplier.name}" created successfully.`,
      data: supplier,
    });
  } catch (error: unknown) {
    const err = error as Error;
    res.status(400).json({
      status: 'error',
      message: err.message || 'Failed to create supplier.',
    });
  }
}

export function updateSupplier(req: Request, res: Response, next: NextFunction): void {
  try {
    const { id } = req.params;
    const { name, contactPerson, phone, email, address } = req.body;

    const updated = pharmacyStore.updateSupplier(id, {
      name,
      contactPerson,
      phone,
      email,
      address,
    });

    if (!updated) {
      res.status(404).json({
        status: 'error',
        message: `Supplier with ID "${id}" not found.`,
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: `Supplier "${updated.name}" updated successfully.`,
      data: updated,
    });
  } catch (error: unknown) {
    const err = error as Error;
    res.status(400).json({
      status: 'error',
      message: err.message || 'Failed to update supplier.',
    });
  }
}

export function deleteSupplier(req: Request, res: Response, next: NextFunction): void {
  try {
    const { id } = req.params;
    const deleted = pharmacyStore.deleteSupplier(id);

    if (!deleted) {
      res.status(404).json({
        status: 'error',
        message: `Supplier with ID "${id}" not found.`,
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: 'Supplier deleted successfully.',
    });
  } catch (error: unknown) {
    const err = error as Error;
    res.status(400).json({
      status: 'error',
      message: err.message || 'Failed to delete supplier.',
    });
  }
}
