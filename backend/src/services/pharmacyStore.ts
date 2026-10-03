export interface MedicineBatch {
  batchNumber: string;
  quantity: number;
  expiryDate: string; // YYYY-MM-DD
}

export interface Medicine {
  id: string;
  name: string;
  category: string;
  price: number;
  minStock: number;
  batches: MedicineBatch[];
  createdAt: string;
  updatedAt: string;
}

export interface SaleRecord {
  id: string;
  medicineId: string;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  batchesDeducted: {
    batchNumber: string;
    quantity: number;
    expiryDate: string;
  }[];
  createdAt: string;
}

export interface ShopSettings {
  shopName: string;
  pharmacistName: string;
  nearExpiryDays: number;
}

// In-memory persistent state for the prototype
class PharmacyStore {
  private settings: ShopSettings = {
    shopName: 'Sri Sai Medical & General Store',
    pharmacistName: 'Store Pharmacist',
    nearExpiryDays: 60,
  };

  private medicines: Medicine[] = [
    {
      id: 'med-1',
      name: 'Paracetamol 500mg Tablets',
      category: 'Analgesics',
      price: 15.0,
      minStock: 30,
      batches: [
        { batchNumber: 'BT-201', quantity: 60, expiryDate: '2027-04-10' },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'med-2',
      name: 'Amoxicillin 500mg Capsules',
      category: 'Antibiotics',
      price: 65.0,
      minStock: 25,
      batches: [
        { batchNumber: 'BT-108', quantity: 12, expiryDate: '2026-11-20' },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'med-3',
      name: 'Metformin 500mg Tablets',
      category: 'Diabetes Care',
      price: 42.0,
      minStock: 40,
      batches: [
        { batchNumber: 'BT-332', quantity: 18, expiryDate: '2026-12-05' },
        { batchNumber: 'BT-333', quantity: 45, expiryDate: '2027-08-15' },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'med-4',
      name: 'Pantoprazole 40mg Tablets',
      category: 'Antacids',
      price: 55.0,
      minStock: 20,
      batches: [
        { batchNumber: 'BT-410', quantity: 35, expiryDate: '2027-02-28' },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'med-5',
      name: 'Cetirizine 10mg Tablets',
      category: 'Antihistamines',
      price: 22.0,
      minStock: 20,
      batches: [
        { batchNumber: 'BT-512', quantity: 14, expiryDate: '2027-05-18' },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'med-6',
      name: 'Azithromycin 500mg Tablets',
      category: 'Antibiotics',
      price: 95.0,
      minStock: 15,
      batches: [
        { batchNumber: 'BT-620', quantity: 28, expiryDate: '2027-01-30' },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  private sales: SaleRecord[] = [
    {
      id: 'sale-1',
      medicineId: 'med-1',
      medicineName: 'Paracetamol 500mg Tablets',
      quantity: 2,
      unitPrice: 15.0,
      totalAmount: 30.0,
      batchesDeducted: [
        { batchNumber: 'BT-201', quantity: 2, expiryDate: '2027-04-10' },
      ],
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(), // 3 hours ago
    },
    {
      id: 'sale-2',
      medicineId: 'med-4',
      medicineName: 'Pantoprazole 40mg Tablets',
      quantity: 1,
      unitPrice: 55.0,
      totalAmount: 55.0,
      batchesDeducted: [
        { batchNumber: 'BT-410', quantity: 1, expiryDate: '2027-02-28' },
      ],
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
    },
    {
      id: 'sale-3',
      medicineId: 'med-6',
      medicineName: 'Azithromycin 500mg Tablets',
      quantity: 1,
      unitPrice: 95.0,
      totalAmount: 95.0,
      batchesDeducted: [
        { batchNumber: 'BT-620', quantity: 1, expiryDate: '2027-01-30' },
      ],
      createdAt: new Date(Date.now() - 3600000 * 1).toISOString(), // 1 hour ago
    },
  ];

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

  // --- Medicines & Inventory ---
  public getAllMedicines(): (Medicine & {
    totalStock: number;
    isLowStock: boolean;
    isNearExpiry: boolean;
    earliestExpiry: string | null;
  })[] {
    const today = new Date();
    const thresholdDays = this.settings.nearExpiryDays;
    const thresholdDate = new Date();
    thresholdDate.setDate(today.getDate() + thresholdDays);

    return this.medicines.map((med) => {
      const activeBatches = med.batches.filter((b) => b.quantity > 0);
      const totalStock = activeBatches.reduce((acc, b) => acc + b.quantity, 0);
      const isLowStock = totalStock <= med.minStock;

      // Find earliest expiry date among active batches
      let earliestExpiry: string | null = null;
      let isNearExpiry = false;

      if (activeBatches.length > 0) {
        const sorted = [...activeBatches].sort(
          (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
        );
        earliestExpiry = sorted[0].expiryDate;
        const earliestDate = new Date(earliestExpiry);
        isNearExpiry = earliestDate <= thresholdDate;
      }

      return {
        ...med,
        totalStock,
        isLowStock,
        isNearExpiry,
        earliestExpiry,
      };
    });
  }

  public getMedicineById(id: string): Medicine | undefined {
    return this.medicines.find((m) => m.id === id);
  }

  public addMedicine(data: {
    name: string;
    category: string;
    price: number;
    minStock: number;
    batchNumber: string;
    quantity: number;
    expiryDate: string;
  }): Medicine {
    const newMed: Medicine = {
      id: `med-${Date.now()}`,
      name: data.name.trim(),
      category: data.category.trim() || 'General',
      price: Math.max(0, Number(data.price)),
      minStock: Math.max(0, Number(data.minStock)),
      batches: [
        {
          batchNumber: data.batchNumber.trim() || `BT-${Math.floor(100 + Math.random() * 900)}`,
          quantity: Math.max(0, Number(data.quantity)),
          expiryDate: data.expiryDate,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.medicines.unshift(newMed);
    return newMed;
  }

  public updateMedicine(
    id: string,
    data: {
      name?: string;
      category?: string;
      price?: number;
      minStock?: number;
      batches?: MedicineBatch[];
    }
  ): Medicine | null {
    const medIndex = this.medicines.findIndex((m) => m.id === id);
    if (medIndex === -1) return null;

    const current = this.medicines[medIndex];
    const updated: Medicine = {
      ...current,
      name: data.name !== undefined ? data.name.trim() : current.name,
      category: data.category !== undefined ? data.category.trim() : current.category,
      price: data.price !== undefined ? Math.max(0, Number(data.price)) : current.price,
      minStock: data.minStock !== undefined ? Math.max(0, Number(data.minStock)) : current.minStock,
      batches: data.batches !== undefined ? data.batches : current.batches,
      updatedAt: new Date().toISOString(),
    };

    this.medicines[medIndex] = updated;
    return updated;
  }

  public deleteMedicine(id: string): boolean {
    const initialLen = this.medicines.length;
    this.medicines = this.medicines.filter((m) => m.id !== id);
    return this.medicines.length < initialLen;
  }

  // --- Sales with FEFO ---
  public getAllSales(): SaleRecord[] {
    return [...this.sales];
  }

  public recordSale(medicineId: string, requestedQuantity: number): {
    sale: SaleRecord;
    updatedMedicine: Medicine;
  } {
    const medicine = this.medicines.find((m) => m.id === medicineId);
    if (!medicine) {
      throw new Error('Medicine not found in inventory.');
    }

    if (requestedQuantity <= 0) {
      throw new Error('Sale quantity must be at least 1.');
    }

    // Sort batches by earliest expiry (FEFO)
    const availableBatches = medicine.batches.filter((b) => b.quantity > 0);
    availableBatches.sort(
      (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
    );

    const totalAvailable = availableBatches.reduce((sum, b) => sum + b.quantity, 0);
    if (totalAvailable < requestedQuantity) {
      throw new Error(
        `Insufficient stock for "${medicine.name}". Available: ${totalAvailable}, Requested: ${requestedQuantity}`
      );
    }

    let remainingToDeduct = requestedQuantity;
    const batchesDeducted: { batchNumber: string; quantity: number; expiryDate: string }[] = [];

    // Deduct stock prioritizing earliest expiring batch
    for (const batch of availableBatches) {
      if (remainingToDeduct <= 0) break;

      const deduct = Math.min(batch.quantity, remainingToDeduct);
      batch.quantity -= deduct;
      remainingToDeduct -= deduct;

      batchesDeducted.push({
        batchNumber: batch.batchNumber,
        quantity: deduct,
        expiryDate: batch.expiryDate,
      });
    }

    medicine.updatedAt = new Date().toISOString();

    const saleRecord: SaleRecord = {
      id: `sale-${Date.now()}`,
      medicineId: medicine.id,
      medicineName: medicine.name,
      quantity: requestedQuantity,
      unitPrice: medicine.price,
      totalAmount: requestedQuantity * medicine.price,
      batchesDeducted,
      createdAt: new Date().toISOString(),
    };

    this.sales.unshift(saleRecord);

    return {
      sale: saleRecord,
      updatedMedicine: medicine,
    };
  }

  // --- Dashboard Summary Stats & Alerts ---
  public getDashboardStats() {
    const medicinesWithMeta = this.getAllMedicines();
    const totalMedicines = medicinesWithMeta.length;
    const availableStock = medicinesWithMeta.reduce((sum, m) => sum + m.totalStock, 0);
    const lowStockMedicines = medicinesWithMeta.filter((m) => m.isLowStock);

    // Filter near expiry batches
    const nearExpiryBatches: {
      medicineId: string;
      medicineName: string;
      batchNumber: string;
      quantity: number;
      expiryDate: string;
      daysRemaining: number;
    }[] = [];

    const today = new Date();
    const thresholdDays = this.settings.nearExpiryDays;
    const thresholdDate = new Date();
    thresholdDate.setDate(today.getDate() + thresholdDays);

    for (const med of this.medicines) {
      for (const batch of med.batches) {
        if (batch.quantity > 0) {
          const exp = new Date(batch.expiryDate);
          if (exp <= thresholdDate) {
            const diffTime = exp.getTime() - today.getTime();
            const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            nearExpiryBatches.push({
              medicineId: med.id,
              medicineName: med.name,
              batchNumber: batch.batchNumber,
              quantity: batch.quantity,
              expiryDate: batch.expiryDate,
              daysRemaining,
            });
          }
        }
      }
    }

    // Sort near expiry by urgency (smallest days remaining first)
    nearExpiryBatches.sort((a, b) => a.daysRemaining - b.daysRemaining);

    // Calculate today's sales
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todaySalesAmount = this.sales
      .filter((s) => new Date(s.createdAt) >= startOfToday)
      .reduce((sum, s) => sum + s.totalAmount, 0);

    return {
      totalMedicines,
      availableStock,
      lowStockCount: lowStockMedicines.length,
      todaySalesAmount,
      lowStockMedicines: lowStockMedicines.map((m) => ({
        id: m.id,
        name: m.name,
        category: m.category,
        totalStock: m.totalStock,
        minStock: m.minStock,
      })),
      nearExpiryMedicines: nearExpiryBatches,
      recentSales: this.sales.slice(0, 6),
      settings: this.settings,
    };
  }
}

export const pharmacyStore = new PharmacyStore();
