export interface MedicineBatch {
  id: string;
  medicineId: string;
  batchNumber: string;
  quantity: number;
  mfgDate?: string;
  expiryDate: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  medicineId: string;
  batchId?: string;
  batchNumber: string;
  movementType: 'Stock Added' | 'Stock Removed' | 'Adjustment';
  quantity: number;
  reason?: string;
  createdAt: string;
}

export interface Medicine {
  id: string;
  name: string;
  genericName?: string;
  category: string;
  manufacturer?: string;
  description?: string;
  unit: string; // 'tablets' | 'strips' | 'bottles' | 'boxes' | 'vials' | 'ampoules' | string
  minStockLevel: number;
  sellingPrice: number;
  purchasePrice?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MedicineWithBatches extends Medicine {
  batches: MedicineBatch[];
  usableStock: number;
  expiredStock: number;
  totalStock: number; // Equals usableStock (expired excluded from usable inventory)
  totalPhysicalStock: number;
  isLowStock: boolean;
  isNearExpiry: boolean;
  isExpired: boolean;
  isOutOfStock: boolean;
  stockStatus: 'In Stock' | 'Low Stock' | 'Near Expiry' | 'Expired' | 'Out of Stock';
  earliestExpiry: string | null;
}

export interface ShopSettings {
  shopName: string;
  pharmacistName: string;
  nearExpiryDays: number;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseItemInput {
  medicineId: string;
  batchNumber: string;
  quantity: number;
  purchasePrice: number;
  expiryDate: string; // YYYY-MM-DD
  mfgDate?: string;
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  medicineId: string;
  medicineName: string;
  batchId?: string;
  batchNumber: string;
  quantity: number;
  purchasePrice: number;
  subtotal: number;
  expiryDate: string;
  mfgDate?: string;
}

export interface Purchase {
  id: string;
  purchaseNumber: string; // e.g. PO-1001
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  totalQuantity: number;
  totalAmount: number;
  notes?: string;
  createdAt: string;
}

export interface SaleBatchAllocation {
  batchId: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  medicineId: string;
  medicineName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  batchAllocations: SaleBatchAllocation[];
}

export interface Sale {
  id: string;
  saleNumber: string; // e.g. INV-1001
  customerName: string;
  items: SaleItem[];
  totalItems: number;
  totalQuantity: number;
  totalAmount: number;
  idempotencyKey?: string;
  createdAt: string;

  // Backward compatibility fields for Phase 1 & 2 single-item consumers
  medicineId?: string;
  medicineName?: string;
  quantity?: number;
  unitPrice?: number;
  batchesDeducted?: {
    batchNumber: string;
    quantity: number;
    expiryDate: string;
  }[];
}

export type SaleRecord = Sale;

export interface FefoAllocationResult {
  success: boolean;
  medicineId: string;
  medicineName: string;
  requestedQuantity: number;
  allocatedBatches: {
    batchId: string;
    batchNumber: string;
    quantity: number;
    expiryDate: string;
  }[];
  usableStockRemaining: number;
  error?: string;
}

class PharmacyStore {
  private settings: ShopSettings = {
    shopName: 'Sri Sai Medical & General Store',
    pharmacistName: 'Store Pharmacist',
    nearExpiryDays: 30, // 30 days for Phase 2 strict near-expiry requirement
  };

  private medicines: Medicine[] = [
    {
      id: 'med-1',
      name: 'Paracetamol 500mg Tablets',
      genericName: 'Acetaminophen',
      category: 'Analgesics',
      manufacturer: 'Apex Healthcare',
      description: 'Standard antipyretic and analgesic for pain & fever relief.',
      unit: 'tablets',
      minStockLevel: 30,
      sellingPrice: 15.0,
      purchasePrice: 9.5,
      createdAt: '2026-08-01T08:00:00.000Z',
      updatedAt: '2026-08-01T08:00:00.000Z',
    },
    {
      id: 'med-2',
      name: 'Amoxicillin 500mg Capsules',
      genericName: 'Amoxicillin Trihydrate',
      category: 'Antibiotics',
      manufacturer: 'Cipla Labs',
      description: 'Broad-spectrum penicillin antibiotic.',
      unit: 'strips',
      minStockLevel: 25,
      sellingPrice: 65.0,
      purchasePrice: 48.0,
      createdAt: '2026-08-05T09:00:00.000Z',
      updatedAt: '2026-08-05T09:00:00.000Z',
    },
    {
      id: 'med-3',
      name: 'Metformin 500mg Tablets',
      genericName: 'Metformin Hydrochloride',
      category: 'Diabetes Care',
      manufacturer: 'Sun Pharma',
      description: 'First-line medication for type 2 diabetes management.',
      unit: 'boxes',
      minStockLevel: 40,
      sellingPrice: 42.0,
      purchasePrice: 29.0,
      createdAt: '2026-08-10T10:00:00.000Z',
      updatedAt: '2026-08-10T10:00:00.000Z',
    },
    {
      id: 'med-4',
      name: 'Pantoprazole 40mg Tablets',
      genericName: 'Pantoprazole Sodium',
      category: 'Antacids',
      manufacturer: 'Alkem Laboratories',
      description: 'Proton pump inhibitor for acid reflux and heartburn.',
      unit: 'strips',
      minStockLevel: 20,
      sellingPrice: 55.0,
      purchasePrice: 36.0,
      createdAt: '2026-08-12T11:00:00.000Z',
      updatedAt: '2026-08-12T11:00:00.000Z',
    },
    {
      id: 'med-5',
      name: 'Cetirizine 10mg Tablets',
      genericName: 'Cetirizine Dihydrochloride',
      category: 'Antihistamines',
      manufacturer: 'Dr. Reddy Laboratories',
      description: 'Non-drowsy allergy and antihistamine medication.',
      unit: 'strips',
      minStockLevel: 25,
      sellingPrice: 22.0,
      purchasePrice: 14.5,
      createdAt: '2026-08-15T12:00:00.000Z',
      updatedAt: '2026-08-15T12:00:00.000Z',
    },
    {
      id: 'med-6',
      name: 'Azithromycin 500mg Tablets',
      genericName: 'Azithromycin',
      category: 'Antibiotics',
      manufacturer: 'Zydus Cadila',
      description: 'Macrolide antibiotic for respiratory & bacterial infections.',
      unit: 'strips',
      minStockLevel: 15,
      sellingPrice: 95.0,
      purchasePrice: 68.0,
      createdAt: '2026-08-20T13:00:00.000Z',
      updatedAt: '2026-08-20T13:00:00.000Z',
    },
    {
      id: 'med-7',
      name: 'Ascoril D Plus Cough Syrup',
      genericName: 'Dextromethorphan + Chlorpheniramine',
      category: 'Respiratory',
      manufacturer: 'Glenmark Pharma',
      description: 'Cough suppressant syrup for dry cough relief.',
      unit: 'bottles',
      minStockLevel: 15,
      sellingPrice: 120.0,
      purchasePrice: 85.0,
      createdAt: '2026-08-22T14:00:00.000Z',
      updatedAt: '2026-08-22T14:00:00.000Z',
    },
  ];

  private batches: MedicineBatch[] = [
    // Paracetamol 500mg (2 batches: B101 & B102)
    {
      id: 'batch-1',
      medicineId: 'med-1',
      batchNumber: 'PCM-B101',
      quantity: 60,
      mfgDate: '2026-01-10',
      expiryDate: '2027-04-10',
      createdAt: '2026-08-01T08:05:00.000Z',
      updatedAt: '2026-08-01T08:05:00.000Z',
    },
    {
      id: 'batch-2',
      medicineId: 'med-1',
      batchNumber: 'PCM-B102',
      quantity: 40,
      mfgDate: '2026-05-15',
      expiryDate: '2027-09-15',
      createdAt: '2026-08-01T08:06:00.000Z',
      updatedAt: '2026-08-01T08:06:00.000Z',
    },
    // Amoxicillin (Near expiry batch expiring in 20 days: 2026-10-23)
    {
      id: 'batch-3',
      medicineId: 'med-2',
      batchNumber: 'AMX-204',
      quantity: 12,
      mfgDate: '2025-11-20',
      expiryDate: '2026-10-23', // <= 30 days from 2026-10-03
      createdAt: '2026-08-05T09:05:00.000Z',
      updatedAt: '2026-08-05T09:05:00.000Z',
    },
    // Metformin (2 batches: one near expiry in 25 days, one in 2027)
    {
      id: 'batch-4',
      medicineId: 'med-3',
      batchNumber: 'MET-332',
      quantity: 18,
      mfgDate: '2025-12-05',
      expiryDate: '2026-10-28', // <= 30 days
      createdAt: '2026-08-10T10:05:00.000Z',
      updatedAt: '2026-08-10T10:05:00.000Z',
    },
    {
      id: 'batch-5',
      medicineId: 'med-3',
      batchNumber: 'MET-333',
      quantity: 45,
      mfgDate: '2026-04-15',
      expiryDate: '2027-08-15',
      createdAt: '2026-08-10T10:06:00.000Z',
      updatedAt: '2026-08-10T10:06:00.000Z',
    },
    // Pantoprazole 40mg
    {
      id: 'batch-6',
      medicineId: 'med-4',
      batchNumber: 'PAN-410',
      quantity: 35,
      mfgDate: '2026-02-28',
      expiryDate: '2027-02-28',
      createdAt: '2026-08-12T11:05:00.000Z',
      updatedAt: '2026-08-12T11:05:00.000Z',
    },
    // Cetirizine 10mg (Low stock: 8 units <= 25 minStockLevel)
    {
      id: 'batch-7',
      medicineId: 'med-5',
      batchNumber: 'CTZ-512',
      quantity: 8,
      mfgDate: '2026-05-18',
      expiryDate: '2027-05-18',
      createdAt: '2026-08-15T12:05:00.000Z',
      updatedAt: '2026-08-15T12:05:00.000Z',
    },
    // Azithromycin 500mg
    {
      id: 'batch-8',
      medicineId: 'med-6',
      batchNumber: 'AZI-620',
      quantity: 28,
      mfgDate: '2026-01-30',
      expiryDate: '2027-01-30',
      createdAt: '2026-08-20T13:05:00.000Z',
      updatedAt: '2026-08-20T13:05:00.000Z',
    },
    // Ascoril D Plus (One EXPIRED batch of 10 units, one FRESH batch of 20 units)
    {
      id: 'batch-9',
      medicineId: 'med-7',
      batchNumber: 'ASC-EXP01',
      quantity: 10,
      mfgDate: '2025-08-01',
      expiryDate: '2026-09-15', // Expired! Must NOT be counted in usable stock
      createdAt: '2026-08-22T14:05:00.000Z',
      updatedAt: '2026-08-22T14:05:00.000Z',
    },
    {
      id: 'batch-10',
      medicineId: 'med-7',
      batchNumber: 'ASC-FRESH02',
      quantity: 20,
      mfgDate: '2026-07-01',
      expiryDate: '2028-01-01',
      createdAt: '2026-08-22T14:06:00.000Z',
      updatedAt: '2026-08-22T14:06:00.000Z',
    },
  ];

  private stockMovements: StockMovement[] = [
    {
      id: 'mov-1',
      medicineId: 'med-1',
      batchId: 'batch-1',
      batchNumber: 'PCM-B101',
      movementType: 'Stock Added',
      quantity: 60,
      reason: 'Initial intake',
      createdAt: '2026-08-01T08:05:00.000Z',
    },
    {
      id: 'mov-2',
      medicineId: 'med-1',
      batchId: 'batch-2',
      batchNumber: 'PCM-B102',
      movementType: 'Stock Added',
      quantity: 40,
      reason: 'Routine replenishment',
      createdAt: '2026-08-01T08:06:00.000Z',
    },
    {
      id: 'mov-3',
      medicineId: 'med-2',
      batchId: 'batch-3',
      batchNumber: 'AMX-204',
      movementType: 'Stock Added',
      quantity: 12,
      reason: 'Initial intake',
      createdAt: '2026-08-05T09:05:00.000Z',
    },
    {
      id: 'mov-4',
      medicineId: 'med-7',
      batchId: 'batch-9',
      batchNumber: 'ASC-EXP01',
      movementType: 'Stock Added',
      quantity: 10,
      reason: 'Historical stock intake',
      createdAt: '2026-08-22T14:05:00.000Z',
    },
    {
      id: 'mov-5',
      medicineId: 'med-7',
      batchId: 'batch-10',
      batchNumber: 'ASC-FRESH02',
      movementType: 'Stock Added',
      quantity: 20,
      reason: 'Fresh batch received',
      createdAt: '2026-08-22T14:06:00.000Z',
    },
  ];

  private suppliers: Supplier[] = [
    {
      id: 'supp-1',
      name: 'MedLife Pharma Distributors',
      contactPerson: 'Rajesh Sharma',
      phone: '+91 98765 43210',
      email: 'orders@medlifedist.com',
      address: 'Plot 45, Industrial Area Phase II, Hyderabad',
      createdAt: '2026-07-15T09:00:00.000Z',
      updatedAt: '2026-07-15T09:00:00.000Z',
    },
    {
      id: 'supp-2',
      name: 'Apollo Surgicals & Generics',
      contactPerson: 'Pooja Verma',
      phone: '+91 98450 11223',
      email: 'supply@apollosurgicals.in',
      address: '12-B MG Road, Bangalore',
      createdAt: '2026-07-20T10:00:00.000Z',
      updatedAt: '2026-07-20T10:00:00.000Z',
    },
    {
      id: 'supp-3',
      name: 'Bharat Pharma Logistics',
      contactPerson: 'Anil Kumar',
      phone: '+91 97110 99887',
      email: 'contact@bharatlogistics.com',
      address: 'Sector 18, Electronic City, Gurgaon',
      createdAt: '2026-08-01T11:00:00.000Z',
      updatedAt: '2026-08-01T11:00:00.000Z',
    },
  ];

  private purchases: Purchase[] = [
    {
      id: 'po-1',
      purchaseNumber: 'PO-1001',
      supplierId: 'supp-1',
      supplierName: 'MedLife Pharma Distributors',
      items: [
        {
          id: 'poi-1',
          purchaseId: 'po-1',
          medicineId: 'med-1',
          medicineName: 'Paracetamol 500mg Tablets',
          batchId: 'batch-1',
          batchNumber: 'PCM-B101',
          quantity: 60,
          purchasePrice: 9.50,
          subtotal: 570.00,
          expiryDate: '2027-04-10',
        },
        {
          id: 'poi-2',
          purchaseId: 'po-1',
          medicineId: 'med-1',
          medicineName: 'Paracetamol 500mg Tablets',
          batchId: 'batch-2',
          batchNumber: 'PCM-B102',
          quantity: 40,
          purchasePrice: 9.50,
          subtotal: 380.00,
          expiryDate: '2027-09-15',
        },
      ],
      totalQuantity: 100,
      totalAmount: 950.00,
      notes: 'Monthly replenishment for Paracetamol and analgesics',
      createdAt: '2026-08-01T08:30:00.000Z',
    },
  ];

  private processedIdempotencyKeys: Set<string> = new Set();

  private sales: Sale[] = [
    {
      id: 'sale-1',
      saleNumber: 'INV-1001',
      customerName: 'Ramesh Patel',
      items: [
        {
          id: 'si-1',
          saleId: 'sale-1',
          medicineId: 'med-1',
          medicineName: 'Paracetamol 500mg Tablets',
          unit: 'tablets',
          quantity: 2,
          unitPrice: 15.0,
          subtotal: 30.0,
          batchAllocations: [
            { batchId: 'batch-1', batchNumber: 'PCM-B101', quantity: 2, expiryDate: '2027-04-10' },
          ],
        },
      ],
      totalItems: 1,
      totalQuantity: 2,
      totalAmount: 30.0,
      medicineId: 'med-1',
      medicineName: 'Paracetamol 500mg Tablets',
      quantity: 2,
      unitPrice: 15.0,
      batchesDeducted: [
        { batchNumber: 'PCM-B101', quantity: 2, expiryDate: '2027-04-10' },
      ],
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
    {
      id: 'sale-2',
      saleNumber: 'INV-1002',
      customerName: 'Sunita Rao',
      items: [
        {
          id: 'si-2',
          saleId: 'sale-2',
          medicineId: 'med-4',
          medicineName: 'Pantoprazole 40mg Tablets',
          unit: 'strips',
          quantity: 1,
          unitPrice: 55.0,
          subtotal: 55.0,
          batchAllocations: [
            { batchId: 'batch-6', batchNumber: 'PAN-410', quantity: 1, expiryDate: '2027-02-28' },
          ],
        },
      ],
      totalItems: 1,
      totalQuantity: 1,
      totalAmount: 55.0,
      medicineId: 'med-4',
      medicineName: 'Pantoprazole 40mg Tablets',
      quantity: 1,
      unitPrice: 55.0,
      batchesDeducted: [
        { batchNumber: 'PAN-410', quantity: 1, expiryDate: '2027-02-28' },
      ],
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
  ];

  // --- Suppliers Management ---
  public getAllSuppliers(search?: string): Supplier[] {
    let list = [...this.suppliers];
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) ||
          s.phone.toLowerCase().includes(q) ||
          (s.email && s.email.toLowerCase().includes(q))
      );
    }
    return list;
  }

  public getSupplierById(id: string): Supplier | null {
    return this.suppliers.find((s) => s.id === id) || null;
  }

  public addSupplier(data: {
    name: string;
    contactPerson?: string;
    phone: string;
    email?: string;
    address?: string;
  }): Supplier {
    if (!data.name || !data.name.trim()) throw new Error('Supplier name is required.');
    if (!data.phone || !data.phone.trim()) throw new Error('Phone number is required.');
    if (data.email && data.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email.trim())) {
        throw new Error('Invalid email format for supplier.');
      }
    }

    const newSupplier: Supplier = {
      id: `supp-${Date.now()}`,
      name: data.name.trim(),
      contactPerson: data.contactPerson ? data.contactPerson.trim() : undefined,
      phone: data.phone.trim(),
      email: data.email ? data.email.trim() : undefined,
      address: data.address ? data.address.trim() : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.suppliers.unshift(newSupplier);
    return newSupplier;
  }

  public updateSupplier(
    id: string,
    data: {
      name?: string;
      contactPerson?: string;
      phone?: string;
      email?: string;
      address?: string;
    }
  ): Supplier | null {
    const index = this.suppliers.findIndex((s) => s.id === id);
    if (index === -1) return null;

    if (data.name !== undefined && !data.name.trim()) {
      throw new Error('Supplier name cannot be empty.');
    }
    if (data.phone !== undefined && !data.phone.trim()) {
      throw new Error('Phone number cannot be empty.');
    }
    if (data.email !== undefined && data.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email.trim())) {
        throw new Error('Invalid email format for supplier.');
      }
    }

    const current = this.suppliers[index];
    const updated: Supplier = {
      ...current,
      name: data.name !== undefined ? data.name.trim() : current.name,
      contactPerson: data.contactPerson !== undefined ? data.contactPerson.trim() : current.contactPerson,
      phone: data.phone !== undefined ? data.phone.trim() : current.phone,
      email: data.email !== undefined ? data.email.trim() : current.email,
      address: data.address !== undefined ? data.address.trim() : current.address,
      updatedAt: new Date().toISOString(),
    };

    this.suppliers[index] = updated;
    return updated;
  }

  public deleteSupplier(id: string): boolean {
    const supp = this.suppliers.find((s) => s.id === id);
    if (!supp) return false;

    // Disallow deletion if any purchase records depend on this supplier
    const dependentPurchases = this.purchases.filter((p) => p.supplierId === id);
    if (dependentPurchases.length > 0) {
      throw new Error(
        `Cannot delete supplier "${supp.name}": ${dependentPurchases.length} purchase record(s) depend on this supplier.`
      );
    }

    const initialLen = this.suppliers.length;
    this.suppliers = this.suppliers.filter((s) => s.id !== id);
    return this.suppliers.length < initialLen;
  }

  // --- Purchases Management ---
  public getAllPurchases(filter?: { supplierId?: string; date?: string }): Purchase[] {
    let list = [...this.purchases];
    if (filter?.supplierId) {
      list = list.filter((p) => p.supplierId === filter.supplierId);
    }
    if (filter?.date) {
      list = list.filter((p) => p.createdAt.startsWith(filter.date!));
    }
    return list;
  }

  public getPurchaseById(id: string): Purchase | null {
    return this.purchases.find((p) => p.id === id || p.purchaseNumber === id) || null;
  }

  public createPurchase(data: {
    supplierId: string;
    items: PurchaseItemInput[];
    notes?: string;
  }): Purchase {
    const supplier = this.suppliers.find((s) => s.id === data.supplierId);
    if (!supplier) throw new Error('Selected supplier does not exist.');

    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      throw new Error('Purchase must contain at least one medicine item.');
    }

    // 1. Pre-validation Phase (Atomic: zero state mutations if any item fails)
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      if (!item.medicineId) throw new Error(`Item #${i + 1}: Medicine selection is required.`);
      const med = this.medicines.find((m) => m.id === item.medicineId);
      if (!med) throw new Error(`Item #${i + 1}: Medicine not found.`);

      if (!item.batchNumber || !item.batchNumber.trim()) {
        throw new Error(`Item #${i + 1} (${med.name}): Batch number is required.`);
      }
      if (Number(item.quantity) <= 0 || !Number.isInteger(Number(item.quantity))) {
        throw new Error(`Item #${i + 1} (${med.name}): Quantity must be a positive whole number.`);
      }
      if (Number(item.purchasePrice) < 0) {
        throw new Error(`Item #${i + 1} (${med.name}): Purchase price must be non-negative.`);
      }
      if (!item.expiryDate) {
        throw new Error(`Item #${i + 1} (${med.name}): Expiry date is required.`);
      }
      if (item.mfgDate && new Date(item.expiryDate) <= new Date(item.mfgDate)) {
        throw new Error(`Item #${i + 1} (${med.name}): Expiry date must be later than manufacturing date.`);
      }

      // Check conflicting batch information
      const existingBatch = this.batches.find(
        (b) =>
          b.medicineId === item.medicineId &&
          b.batchNumber.toLowerCase() === item.batchNumber.trim().toLowerCase()
      );
      if (existingBatch) {
        if (existingBatch.expiryDate !== item.expiryDate) {
          throw new Error(
            `Conflicting batch details for "${med.name}": Batch "${item.batchNumber}" already exists with expiry date ${existingBatch.expiryDate}. Cannot merge incoming batch with conflicting expiry date ${item.expiryDate}. Please assign a distinct batch number or correct the date.`
          );
        }
      }
    }

    // 2. Execution Phase (Atomic commit)
    const purchaseId = `po-${Date.now()}`;
    const purchaseNumber = `PO-${1000 + this.purchases.length + 1}`;
    const purchaseItems: PurchaseItem[] = [];
    let totalQuantity = 0;
    let totalAmount = 0;

    for (const item of data.items) {
      const med = this.medicines.find((m) => m.id === item.medicineId)!;
      const qty = Number(item.quantity);
      const price = Number(item.purchasePrice);
      const subtotal = qty * price;
      totalQuantity += qty;
      totalAmount += subtotal;

      const existingBatch = this.batches.find(
        (b) =>
          b.medicineId === item.medicineId &&
          b.batchNumber.toLowerCase() === item.batchNumber.trim().toLowerCase()
      );

      let batchId: string;
      if (existingBatch) {
        existingBatch.quantity += qty;
        existingBatch.updatedAt = new Date().toISOString();
        batchId = existingBatch.id;
      } else {
        batchId = `batch-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const newBatch: MedicineBatch = {
          id: batchId,
          medicineId: med.id,
          batchNumber: item.batchNumber.trim(),
          quantity: qty,
          mfgDate: item.mfgDate || undefined,
          expiryDate: item.expiryDate,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        this.batches.unshift(newBatch);
      }

      // Update medicine purchase price if provided
      if (price > 0) {
        med.purchasePrice = price;
        med.updatedAt = new Date().toISOString();
      }

      // Record Stock Movement as 'Stock Added'
      this.stockMovements.unshift({
        id: `mov-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        medicineId: med.id,
        batchId,
        batchNumber: item.batchNumber.trim(),
        movementType: 'Stock Added',
        quantity: qty,
        reason: `Purchase ${purchaseNumber} from ${supplier.name}`,
        createdAt: new Date().toISOString(),
      });

      purchaseItems.push({
        id: `poi-${Date.now()}-${purchaseItems.length + 1}`,
        purchaseId,
        medicineId: med.id,
        medicineName: med.name,
        batchId,
        batchNumber: item.batchNumber.trim(),
        quantity: qty,
        purchasePrice: price,
        subtotal,
        expiryDate: item.expiryDate,
        mfgDate: item.mfgDate,
      });
    }

    const purchase: Purchase = {
      id: purchaseId,
      purchaseNumber,
      supplierId: supplier.id,
      supplierName: supplier.name,
      items: purchaseItems,
      totalQuantity,
      totalAmount,
      notes: data.notes ? data.notes.trim() : undefined,
      createdAt: new Date().toISOString(),
    };

    this.purchases.unshift(purchase);
    return purchase;
  }

  // --- Sales Management ---
  public getAllSales(filter?: { search?: string; date?: string }): Sale[] {
    let list = [...this.sales];
    if (filter?.search && filter.search.trim()) {
      const q = filter.search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.saleNumber.toLowerCase().includes(q) ||
          (s.customerName && s.customerName.toLowerCase().includes(q)) ||
          s.id.toLowerCase().includes(q) ||
          s.items.some((it) => it.medicineName.toLowerCase().includes(q))
      );
    }
    if (filter?.date) {
      list = list.filter((s) => s.createdAt.startsWith(filter.date!));
    }
    return list;
  }

  public getSaleById(id: string): Sale | null {
    return this.sales.find((s) => s.id === id || s.saleNumber === id) || null;
  }

  public createSale(data: {
    customerName?: string;
    items: { medicineId: string; quantity: number }[];
    idempotencyKey?: string;
  }): Sale {
    // 1. Idempotency & duplicate submission check
    if (data.idempotencyKey) {
      if (this.processedIdempotencyKeys.has(data.idempotencyKey)) {
        throw new Error('Duplicate sale submission detected. This sale has already been processed.');
      }
    }

    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      throw new Error('Sale must contain at least one medicine item.');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 2. Pre-allocation verification (Atomic FEFO plan)
    interface PlannedAllocation {
      medicine: Medicine;
      quantity: number;
      subtotal: number;
      batchesToDeduct: {
        batch: MedicineBatch;
        quantity: number;
      }[];
    }

    const plannedAllocations: PlannedAllocation[] = [];
    const batchQuantityTracker = new Map<string, number>();
    for (const b of this.batches) {
      batchQuantityTracker.set(b.id, b.quantity);
    }

    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      if (!item.medicineId) throw new Error(`Item #${i + 1}: Medicine ID is required.`);
      const qty = Number(item.quantity);
      if (!qty || qty <= 0 || !Number.isInteger(qty)) {
        throw new Error(`Item #${i + 1}: Quantity must be a positive whole number.`);
      }

      const med = this.medicines.find((m) => m.id === item.medicineId);
      if (!med) throw new Error(`Medicine "${item.medicineId}" not found.`);

      // Usable active batches: quantity > 0 and expiryDate >= today
      const usableBatches = this.batches
        .filter(
          (b) =>
            b.medicineId === med.id &&
            (batchQuantityTracker.get(b.id) || 0) > 0 &&
            new Date(b.expiryDate) >= today
        )
        .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

      const availableUsable = usableBatches.reduce(
        (sum, b) => sum + (batchQuantityTracker.get(b.id) || 0),
        0
      );

      if (availableUsable < qty) {
        throw new Error(
          `Insufficient usable stock for "${med.name}". Usable in stock: ${availableUsable} ${med.unit}, Requested: ${qty} ${med.unit}. (Note: Expired batches are excluded from usable stock).`
        );
      }

      let remainingNeeded = qty;
      const batchesToDeduct: { batch: MedicineBatch; quantity: number }[] = [];

      for (const batch of usableBatches) {
        if (remainingNeeded <= 0) break;
        const currentAvail = batchQuantityTracker.get(batch.id) || 0;
        const take = Math.min(currentAvail, remainingNeeded);
        batchesToDeduct.push({ batch, quantity: take });
        batchQuantityTracker.set(batch.id, currentAvail - take);
        remainingNeeded -= take;
      }

      plannedAllocations.push({
        medicine: med,
        quantity: qty,
        subtotal: qty * med.sellingPrice,
        batchesToDeduct,
      });
    }

    // 3. Execution Phase (Atomic commit)
    const saleId = `sale-${Date.now()}`;
    const saleNumber = `INV-${1000 + this.sales.length + 1}`;
    const saleItems: SaleItem[] = [];
    let totalQuantity = 0;
    let totalAmount = 0;

    for (const planned of plannedAllocations) {
      const med = planned.medicine;
      totalQuantity += planned.quantity;
      totalAmount += planned.subtotal;

      const allocationsForLine: SaleBatchAllocation[] = [];

      for (const bDeduct of planned.batchesToDeduct) {
        bDeduct.batch.quantity -= bDeduct.quantity;
        bDeduct.batch.updatedAt = new Date().toISOString();

        allocationsForLine.push({
          batchId: bDeduct.batch.id,
          batchNumber: bDeduct.batch.batchNumber,
          quantity: bDeduct.quantity,
          expiryDate: bDeduct.batch.expiryDate,
        });

        // Record Stock Movement as 'Stock Removed'
        this.stockMovements.unshift({
          id: `mov-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          medicineId: med.id,
          batchId: bDeduct.batch.id,
          batchNumber: bDeduct.batch.batchNumber,
          movementType: 'Stock Removed',
          quantity: -bDeduct.quantity,
          reason: `Sale ${saleNumber} dispensed (FEFO batch ${bDeduct.batch.batchNumber})`,
          createdAt: new Date().toISOString(),
        });
      }

      saleItems.push({
        id: `si-${Date.now()}-${saleItems.length + 1}`,
        saleId,
        medicineId: med.id,
        medicineName: med.name,
        unit: med.unit,
        quantity: planned.quantity,
        unitPrice: med.sellingPrice,
        subtotal: planned.subtotal,
        batchAllocations: allocationsForLine,
      });
    }

    const primaryItem = saleItems[0];
    const sale: Sale = {
      id: saleId,
      saleNumber,
      customerName: data.customerName?.trim() || 'Walk-in Customer',
      items: saleItems,
      totalItems: saleItems.length,
      totalQuantity,
      totalAmount,
      idempotencyKey: data.idempotencyKey,
      createdAt: new Date().toISOString(),

      // Backward compatibility fields
      medicineId: primaryItem.medicineId,
      medicineName: primaryItem.medicineName,
      quantity: totalQuantity,
      unitPrice: primaryItem.unitPrice,
      batchesDeducted: saleItems.flatMap((si) =>
        si.batchAllocations.map((ba) => ({
          batchNumber: ba.batchNumber,
          quantity: ba.quantity,
          expiryDate: ba.expiryDate,
        }))
      ),
    };

    if (data.idempotencyKey) {
      this.processedIdempotencyKeys.add(data.idempotencyKey);
    }

    this.sales.unshift(sale);
    return sale;
  }

  public recordSale(medicineId: string, quantity: number) {
    const sale = this.createSale({
      items: [{ medicineId, quantity }],
    });
    const updatedMedicine = this.getMedicineById(medicineId)!;
    return {
      sale,
      updatedMedicine,
    };
  }

  public getTodaySalesAmount(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.sales
      .filter((s) => new Date(s.createdAt) >= today)
      .reduce((sum, s) => sum + s.totalAmount, 0);
  }

  // --- Settings ---
  public getSettings(): ShopSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<ShopSettings>): ShopSettings {
    if (newSettings.shopName !== undefined && newSettings.shopName.trim()) {
      this.settings.shopName = newSettings.shopName.trim();
    }
    if (newSettings.pharmacistName !== undefined && newSettings.pharmacistName.trim()) {
      this.settings.pharmacistName = newSettings.pharmacistName.trim();
    }
    if (newSettings.nearExpiryDays !== undefined && newSettings.nearExpiryDays > 0) {
      this.settings.nearExpiryDays = Number(newSettings.nearExpiryDays);
    }
    return { ...this.settings };
  }

  // --- Helper: Enrich medicine with batch & stock metadata ---
  private enrichMedicine(med: Medicine): MedicineWithBatches {
    const medBatches = this.batches.filter((b) => b.medicineId === med.id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nearExpiryDaysThreshold = this.settings.nearExpiryDays;
    const thresholdDate = new Date();
    thresholdDate.setDate(today.getDate() + nearExpiryDaysThreshold);

    // Physical stock
    const totalPhysicalStock = medBatches.reduce((sum, b) => sum + b.quantity, 0);

    // CRITICAL: Exclude expired batches from usable stock!
    const usableBatches = medBatches.filter((b) => {
      const exp = new Date(b.expiryDate);
      return exp >= today && b.quantity > 0;
    });

    const expiredBatches = medBatches.filter((b) => {
      const exp = new Date(b.expiryDate);
      return exp < today && b.quantity > 0;
    });

    const usableStock = usableBatches.reduce((sum, b) => sum + b.quantity, 0);
    const expiredStock = expiredBatches.reduce((sum, b) => sum + b.quantity, 0);

    // Flags
    const isOutOfStock = usableStock === 0;
    const isLowStock = usableStock > 0 && usableStock <= med.minStockLevel;

    // Check near expiry among usable batches (within next 30 days)
    const isNearExpiry = usableBatches.some((b) => {
      const exp = new Date(b.expiryDate);
      return exp <= thresholdDate && exp >= today;
    });

    const isExpired = expiredBatches.length > 0;

    // Earliest expiry date among usable batches
    let earliestExpiry: string | null = null;
    if (usableBatches.length > 0) {
      const sorted = [...usableBatches].sort(
        (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
      );
      earliestExpiry = sorted[0].expiryDate;
    } else if (medBatches.length > 0) {
      earliestExpiry = medBatches[0].expiryDate;
    }

    // Consolidated Stock Status
    let stockStatus: MedicineWithBatches['stockStatus'] = 'In Stock';
    if (isOutOfStock) {
      stockStatus = 'Out of Stock';
    } else if (isExpired && usableStock === 0) {
      stockStatus = 'Expired';
    } else if (isLowStock) {
      stockStatus = 'Low Stock';
    } else if (isNearExpiry) {
      stockStatus = 'Near Expiry';
    } else if (isExpired) {
      stockStatus = 'Expired';
    }

    return {
      ...med,
      batches: medBatches,
      usableStock,
      expiredStock,
      totalStock: usableStock, // Usable stock
      totalPhysicalStock,
      isLowStock,
      isNearExpiry,
      isExpired,
      isOutOfStock,
      stockStatus,
      earliestExpiry,
    };
  }

  // --- Medicines CRUD ---
  public getAllMedicines(): MedicineWithBatches[] {
    return this.medicines.map((m) => this.enrichMedicine(m));
  }

  public getMedicineById(id: string): MedicineWithBatches | null {
    const med = this.medicines.find((m) => m.id === id);
    if (!med) return null;
    return this.enrichMedicine(med);
  }

  public addMedicine(data: {
    name: string;
    genericName?: string;
    category: string;
    manufacturer?: string;
    description?: string;
    unit: string;
    minStockLevel: number;
    sellingPrice: number;
    purchasePrice?: number;
    batchNumber: string;
    quantity: number;
    mfgDate?: string;
    expiryDate: string;
  }): MedicineWithBatches {
    // Validations
    if (!data.name || !data.name.trim()) throw new Error('Medicine name is required.');
    if (!data.category || !data.category.trim()) throw new Error('Category is required.');
    if (Number(data.sellingPrice) <= 0) throw new Error('Selling price must be greater than zero.');
    if (Number(data.minStockLevel) < 0) throw new Error('Minimum stock level must be non-negative.');
    if (Number(data.quantity) < 0) throw new Error('Quantity must be non-negative.');
    if (!data.batchNumber || !data.batchNumber.trim()) throw new Error('Batch number is required.');
    if (!data.expiryDate) throw new Error('Expiry date is required.');

    if (data.mfgDate && new Date(data.expiryDate) <= new Date(data.mfgDate)) {
      throw new Error('Expiry date must be later than the manufacturing date.');
    }

    const medId = `med-${Date.now()}`;
    const newMed: Medicine = {
      id: medId,
      name: data.name.trim(),
      genericName: data.genericName ? data.genericName.trim() : undefined,
      category: data.category.trim(),
      manufacturer: data.manufacturer ? data.manufacturer.trim() : undefined,
      description: data.description ? data.description.trim() : undefined,
      unit: data.unit ? data.unit.trim().toLowerCase() : 'tablets',
      minStockLevel: Math.max(0, Number(data.minStockLevel)),
      sellingPrice: Number(data.sellingPrice),
      purchasePrice: data.purchasePrice !== undefined ? Number(data.purchasePrice) : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const batchId = `batch-${Date.now()}`;
    const initialBatch: MedicineBatch = {
      id: batchId,
      medicineId: medId,
      batchNumber: data.batchNumber.trim(),
      quantity: Math.max(0, Number(data.quantity)),
      mfgDate: data.mfgDate || undefined,
      expiryDate: data.expiryDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.medicines.unshift(newMed);
    this.batches.unshift(initialBatch);

    // Record Stock Movement
    if (initialBatch.quantity > 0) {
      this.stockMovements.unshift({
        id: `mov-${Date.now()}`,
        medicineId: medId,
        batchId: batchId,
        batchNumber: initialBatch.batchNumber,
        movementType: 'Stock Added',
        quantity: initialBatch.quantity,
        reason: 'Initial stock intake',
        createdAt: new Date().toISOString(),
      });
    }

    return this.enrichMedicine(newMed);
  }

  public updateMedicine(
    id: string,
    data: {
      name?: string;
      genericName?: string;
      category?: string;
      manufacturer?: string;
      description?: string;
      unit?: string;
      minStockLevel?: number;
      sellingPrice?: number;
      purchasePrice?: number;
    }
  ): MedicineWithBatches | null {
    const medIndex = this.medicines.findIndex((m) => m.id === id);
    if (medIndex === -1) return null;

    if (data.sellingPrice !== undefined && Number(data.sellingPrice) <= 0) {
      throw new Error('Selling price must be greater than zero.');
    }
    if (data.minStockLevel !== undefined && Number(data.minStockLevel) < 0) {
      throw new Error('Minimum stock level must be non-negative.');
    }

    const current = this.medicines[medIndex];
    const updated: Medicine = {
      ...current,
      name: data.name !== undefined ? data.name.trim() : current.name,
      genericName: data.genericName !== undefined ? data.genericName.trim() : current.genericName,
      category: data.category !== undefined ? data.category.trim() : current.category,
      manufacturer: data.manufacturer !== undefined ? data.manufacturer.trim() : current.manufacturer,
      description: data.description !== undefined ? data.description.trim() : current.description,
      unit: data.unit !== undefined ? data.unit.trim().toLowerCase() : current.unit,
      minStockLevel: data.minStockLevel !== undefined ? Number(data.minStockLevel) : current.minStockLevel,
      sellingPrice: data.sellingPrice !== undefined ? Number(data.sellingPrice) : current.sellingPrice,
      purchasePrice: data.purchasePrice !== undefined ? Number(data.purchasePrice) : current.purchasePrice,
      updatedAt: new Date().toISOString(),
    };

    this.medicines[medIndex] = updated;
    return this.enrichMedicine(updated);
  }

  public deleteMedicine(id: string): boolean {
    const initialLen = this.medicines.length;
    this.medicines = this.medicines.filter((m) => m.id !== id);
    this.batches = this.batches.filter((b) => b.medicineId !== id);
    this.stockMovements = this.stockMovements.filter((mov) => mov.medicineId !== id);
    return this.medicines.length < initialLen;
  }

  // --- Batches Management ---
  public getBatches(medicineId: string): MedicineBatch[] {
    return this.batches.filter((b) => b.medicineId === medicineId);
  }

  public addBatch(
    medicineId: string,
    data: {
      batchNumber: string;
      quantity: number;
      mfgDate?: string;
      expiryDate: string;
      reason?: string;
    }
  ): MedicineBatch {
    const med = this.medicines.find((m) => m.id === medicineId);
    if (!med) throw new Error('Medicine not found.');

    if (!data.batchNumber || !data.batchNumber.trim()) throw new Error('Batch number is required.');
    if (Number(data.quantity) < 0) throw new Error('Batch quantity must be non-negative.');
    if (!data.expiryDate) throw new Error('Expiry date is required.');

    if (data.mfgDate && new Date(data.expiryDate) <= new Date(data.mfgDate)) {
      throw new Error('Expiry date must be later than the manufacturing date.');
    }

    // Check duplicate batch number for this medicine
    const exists = this.batches.some(
      (b) => b.medicineId === medicineId && b.batchNumber.toLowerCase() === data.batchNumber.trim().toLowerCase()
    );
    if (exists) {
      throw new Error(`Batch "${data.batchNumber}" already exists for this medicine. Update the existing batch instead.`);
    }

    const batchId = `batch-${Date.now()}`;
    const newBatch: MedicineBatch = {
      id: batchId,
      medicineId,
      batchNumber: data.batchNumber.trim(),
      quantity: Math.max(0, Number(data.quantity)),
      mfgDate: data.mfgDate || undefined,
      expiryDate: data.expiryDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.batches.unshift(newBatch);

    // Record Stock Movement
    if (newBatch.quantity > 0) {
      this.stockMovements.unshift({
        id: `mov-${Date.now()}`,
        medicineId,
        batchId,
        batchNumber: newBatch.batchNumber,
        movementType: 'Stock Added',
        quantity: newBatch.quantity,
        reason: data.reason || 'New batch received',
        createdAt: new Date().toISOString(),
      });
    }

    return newBatch;
  }

  public updateBatch(
    medicineId: string,
    batchId: string,
    data: {
      batchNumber?: string;
      quantity?: number;
      mfgDate?: string;
      expiryDate?: string;
      reason?: string;
    }
  ): MedicineBatch | null {
    const batchIndex = this.batches.findIndex((b) => b.id === batchId && b.medicineId === medicineId);
    if (batchIndex === -1) return null;

    const current = this.batches[batchIndex];

    const newExpiry = data.expiryDate || current.expiryDate;
    const newMfg = data.mfgDate !== undefined ? data.mfgDate : current.mfgDate;
    if (newMfg && new Date(newExpiry) <= new Date(newMfg)) {
      throw new Error('Expiry date must be later than the manufacturing date.');
    }

    // Quantity delta for movement log
    const oldQty = current.quantity;
    const newQty = data.quantity !== undefined ? Math.max(0, Number(data.quantity)) : current.quantity;

    const updated: MedicineBatch = {
      ...current,
      batchNumber: data.batchNumber !== undefined ? data.batchNumber.trim() : current.batchNumber,
      quantity: newQty,
      mfgDate: newMfg,
      expiryDate: newExpiry,
      updatedAt: new Date().toISOString(),
    };

    this.batches[batchIndex] = updated;

    // If quantity changed, record Adjustment movement
    if (newQty !== oldQty) {
      const delta = newQty - oldQty;
      this.stockMovements.unshift({
        id: `mov-${Date.now()}`,
        medicineId,
        batchId: current.id,
        batchNumber: updated.batchNumber,
        movementType: 'Adjustment',
        quantity: delta,
        reason: data.reason || `Stock count adjusted from ${oldQty} to ${newQty}`,
        createdAt: new Date().toISOString(),
      });
    }

    return updated;
  }

  // --- Stock Movement History ---
  public getStockMovements(medicineId?: string, limit = 50): (StockMovement & { medicineName: string })[] {
    let list = this.stockMovements;
    if (medicineId) {
      list = list.filter((m) => m.medicineId === medicineId);
    }
    return list.slice(0, limit).map((mov) => {
      const med = this.medicines.find((m) => m.id === mov.medicineId);
      return {
        ...mov,
        medicineName: med ? med.name : 'Unknown Medicine',
      };
    });
  }

  // --- Reusable FEFO Allocation Logic ---
  public allocateFefo(medicineId: string, requestedQuantity: number, reason = 'Dispensed / Sold'): FefoAllocationResult {
    const med = this.medicines.find((m) => m.id === medicineId);
    if (!med) {
      return {
        success: false,
        medicineId,
        medicineName: 'Unknown',
        requestedQuantity,
        allocatedBatches: [],
        usableStockRemaining: 0,
        error: 'Medicine not found.',
      };
    }

    if (requestedQuantity <= 0) {
      return {
        success: false,
        medicineId,
        medicineName: med.name,
        requestedQuantity,
        allocatedBatches: [],
        usableStockRemaining: 0,
        error: 'Allocation quantity must be greater than zero.',
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Usable active batches only: quantity > 0 and NOT expired
    const usableBatches = this.batches.filter(
      (b) => b.medicineId === medicineId && b.quantity > 0 && new Date(b.expiryDate) >= today
    );

    // Sort by earliest expiration date (FEFO)
    usableBatches.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    const totalUsable = usableBatches.reduce((sum, b) => sum + b.quantity, 0);
    if (totalUsable < requestedQuantity) {
      return {
        success: false,
        medicineId,
        medicineName: med.name,
        requestedQuantity,
        allocatedBatches: [],
        usableStockRemaining: totalUsable,
        error: `Insufficient usable stock for "${med.name}". Usable: ${totalUsable} ${med.unit}, Requested: ${requestedQuantity} ${med.unit}`,
      };
    }

    let remainingToDeduct = requestedQuantity;
    const allocatedBatches: {
      batchId: string;
      batchNumber: string;
      quantity: number;
      expiryDate: string;
    }[] = [];

    for (const batch of usableBatches) {
      if (remainingToDeduct <= 0) break;

      const deduct = Math.min(batch.quantity, remainingToDeduct);
      batch.quantity -= deduct;
      batch.updatedAt = new Date().toISOString();
      remainingToDeduct -= deduct;

      allocatedBatches.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        quantity: deduct,
        expiryDate: batch.expiryDate,
      });

      // Log movement for batch deduction
      this.stockMovements.unshift({
        id: `mov-${Date.now()}-${Math.random()}`,
        medicineId,
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        movementType: 'Stock Removed',
        quantity: -deduct,
        reason: `${reason} (FEFO batch ${batch.batchNumber})`,
        createdAt: new Date().toISOString(),
      });
    }

    const updatedUsable = totalUsable - requestedQuantity;

    return {
      success: true,
      medicineId,
      medicineName: med.name,
      requestedQuantity,
      allocatedBatches,
      usableStockRemaining: updatedUsable,
    };
  }

  // --- Inventory Alerts Overview ---
  public getInventoryAlerts() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nearExpiryDaysThreshold = this.settings.nearExpiryDays || 30;
    const thresholdDate = new Date();
    thresholdDate.setDate(today.getDate() + nearExpiryDaysThreshold);

    const enriched = this.getAllMedicines();

    // 1. Low stock medicines (usable stock > 0 but <= minStockLevel)
    const lowStockMedicines = enriched.filter((m) => m.isLowStock);

    // 2. Out of stock medicines (usable stock === 0)
    const outOfStockMedicines = enriched.filter((m) => m.isOutOfStock);

    // 3. Near expiry batches (expiring within next 30 days)
    const nearExpiryBatches: {
      medicineId: string;
      medicineName: string;
      batchId: string;
      batchNumber: string;
      quantity: number;
      expiryDate: string;
      daysRemaining: number;
      unit: string;
    }[] = [];

    // 4. Expired batches (past expiry date)
    const expiredBatches: {
      medicineId: string;
      medicineName: string;
      batchId: string;
      batchNumber: string;
      quantity: number;
      expiryDate: string;
      daysRemaining: number;
      unit: string;
    }[] = [];

    for (const med of this.medicines) {
      const medBatches = this.batches.filter((b) => b.medicineId === med.id);
      for (const batch of medBatches) {
        if (batch.quantity > 0) {
          const exp = new Date(batch.expiryDate);
          exp.setHours(0, 0, 0, 0);
          const diffTime = exp.getTime() - today.getTime();
          const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (daysRemaining < 0) {
            expiredBatches.push({
              medicineId: med.id,
              medicineName: med.name,
              batchId: batch.id,
              batchNumber: batch.batchNumber,
              quantity: batch.quantity,
              expiryDate: batch.expiryDate,
              daysRemaining,
              unit: med.unit,
            });
          } else if (daysRemaining <= nearExpiryDaysThreshold) {
            nearExpiryBatches.push({
              medicineId: med.id,
              medicineName: med.name,
              batchId: batch.id,
              batchNumber: batch.batchNumber,
              quantity: batch.quantity,
              expiryDate: batch.expiryDate,
              daysRemaining,
              unit: med.unit,
            });
          }
        }
      }
    }

    nearExpiryBatches.sort((a, b) => a.daysRemaining - b.daysRemaining);
    expiredBatches.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return {
      lowStockMedicines,
      outOfStockMedicines,
      nearExpiryBatches,
      expiredBatches,
      summary: {
        totalMedicines: enriched.length,
        totalUsableUnits: enriched.reduce((sum, m) => sum + m.usableStock, 0),
        lowStockCount: lowStockMedicines.length,
        outOfStockCount: outOfStockMedicines.length,
        nearExpiryBatchCount: nearExpiryBatches.length,
        expiredBatchCount: expiredBatches.length,
      },
    };
  }
}

export const pharmacyStore = new PharmacyStore();
