export * from '../types/pharmacy.js';
import {
  Medicine,
  MedicineBatch,
  MedicineWithBatches,
  StockMovement,
  ShopSettings,
  Supplier,
  Purchase,
  PurchaseItemInput,
  PurchaseItem,
  Sale,
  SaleItem,
  SaleBatchAllocation,
  FefoAllocationResult,
  ConfirmBillInput,
  ConfirmBillResult,
  PurchaseRequest,
  PurchaseRequestStatus,
  SupplierConversation,
  SupplierMessage,
  InAppNotification,
  ExtractedOrderDetails,
} from '../types/pharmacy.js';
import { supplierAgentService } from './supplierAgentService.js';

function buildSeedHistoricalSales(): Sale[] {
  const sales: Sale[] = [];
  const now = Date.now();
  const oneDayMs = 24 * 3600 * 1000;

  const customers = [
    'Ramesh Patel', 'Sunita Rao', 'Pooja Verma', 'Amitabh Sen', 'Kavita Reddy',
    'Rajesh Kumar', 'Deepa Nair', 'Vikas Sharma', 'Ananya Iyer', 'Mohammed Farooq',
    'Sneha Joshi', 'Arun Mehra', 'Bhavna Dave', 'Suresh Menon', 'Priyanka Das'
  ];

  let invoiceCounter = 1000;

  // Generate 30 days of realistic daily counter sales
  for (let day = 29; day >= 0; day--) {
    const dayDate = new Date(now - day * oneDayMs);
    const dayIndex = 29 - day;

    // 1. Paracetamol 500mg: Upward trending sales (5-7 early, rising to 10-14 recently)
    const pcmQty = day <= 7 ? 10 + (dayIndex % 4) : 5 + (dayIndex % 3);
    const pcmCust = customers[(day * 3) % customers.length];
    invoiceCounter++;
    sales.push({
      id: `sale-pcm-${day}`,
      saleNumber: `INV-${invoiceCounter}`,
      customerName: pcmCust,
      items: [
        {
          id: `si-pcm-${day}`,
          saleId: `sale-pcm-${day}`,
          medicineId: 'med-1',
          medicineName: 'Paracetamol 500mg Tablets',
          unit: 'tablets',
          quantity: pcmQty,
          unitPrice: 15.0,
          subtotal: pcmQty * 15.0,
          batchAllocations: [{ batchId: 'batch-1', batchNumber: 'PCM-B101', quantity: pcmQty, expiryDate: '2027-04-10' }],
        }
      ],
      totalItems: 1,
      totalQuantity: pcmQty,
      totalAmount: pcmQty * 15.0,
      medicineId: 'med-1',
      medicineName: 'Paracetamol 500mg Tablets',
      quantity: pcmQty,
      unitPrice: 15.0,
      createdAt: new Date(new Date(dayDate).setHours(10 + (day % 6), 15, 0, 0)).toISOString(),
    });

    // 2. Amoxicillin 500mg: Steady trend (~1-2 strips on most days)
    if (day % 3 !== 0) {
      const amoxQty = 1 + (dayIndex % 2);
      const amoxCust = customers[(day * 5) % customers.length];
      invoiceCounter++;
      sales.push({
        id: `sale-amx-${day}`,
        saleNumber: `INV-${invoiceCounter}`,
        customerName: amoxCust,
        items: [
          {
            id: `si-amx-${day}`,
            saleId: `sale-amx-${day}`,
            medicineId: 'med-2',
            medicineName: 'Amoxicillin 500mg Capsules',
            unit: 'strips',
            quantity: amoxQty,
            unitPrice: 65.0,
            subtotal: amoxQty * 65.0,
            batchAllocations: [{ batchId: 'batch-3', batchNumber: 'AMX-204', quantity: amoxQty, expiryDate: '2026-10-23' }],
          }
        ],
        totalItems: 1,
        totalQuantity: amoxQty,
        totalAmount: amoxQty * 65.0,
        medicineId: 'med-2',
        medicineName: 'Amoxicillin 500mg Capsules',
        quantity: amoxQty,
        unitPrice: 65.0,
        createdAt: new Date(new Date(dayDate).setHours(11 + (day % 5), 30, 0, 0)).toISOString(),
      });
    }

    // 3. Metformin 500mg: Downward trend (4-5 early on, dropping to 1-2 in recent 10 days)
    const metQty = day > 10 ? 3 + (dayIndex % 3) : 1 + (dayIndex % 2);
    const metCust = customers[(day * 7) % customers.length];
    invoiceCounter++;
    sales.push({
      id: `sale-met-${day}`,
      saleNumber: `INV-${invoiceCounter}`,
      customerName: metCust,
      items: [
        {
          id: `si-met-${day}`,
          saleId: `sale-met-${day}`,
          medicineId: 'med-3',
          medicineName: 'Metformin 500mg Tablets',
          unit: 'boxes',
          quantity: metQty,
          unitPrice: 42.0,
          subtotal: metQty * 42.0,
          batchAllocations: [{ batchId: 'batch-4', batchNumber: 'MET-332', quantity: metQty, expiryDate: '2026-10-28' }],
        }
      ],
      totalItems: 1,
      totalQuantity: metQty,
      totalAmount: metQty * 42.0,
      medicineId: 'med-3',
      medicineName: 'Metformin 500mg Tablets',
      quantity: metQty,
      unitPrice: 42.0,
      createdAt: new Date(new Date(dayDate).setHours(12 + (day % 4), 45, 0, 0)).toISOString(),
    });

    // 4. Pantoprazole 40mg: Steady ~2 strips
    if (day % 2 === 0) {
      const panQty = 2;
      const panCust = customers[(day * 2) % customers.length];
      invoiceCounter++;
      sales.push({
        id: `sale-pan-${day}`,
        saleNumber: `INV-${invoiceCounter}`,
        customerName: panCust,
        items: [
          {
            id: `si-pan-${day}`,
            saleId: `sale-pan-${day}`,
            medicineId: 'med-4',
            medicineName: 'Pantoprazole 40mg Tablets',
            unit: 'strips',
            quantity: panQty,
            unitPrice: 55.0,
            subtotal: panQty * 55.0,
            batchAllocations: [{ batchId: 'batch-6', batchNumber: 'PAN-410', quantity: panQty, expiryDate: '2027-02-28' }],
          }
        ],
        totalItems: 1,
        totalQuantity: panQty,
        totalAmount: panQty * 55.0,
        medicineId: 'med-4',
        medicineName: 'Pantoprazole 40mg Tablets',
        quantity: panQty,
        unitPrice: 55.0,
        createdAt: new Date(new Date(dayDate).setHours(14 + (day % 4), 20, 0, 0)).toISOString(),
      });
    }

    // 5. Cetirizine 10mg: High daily velocity (2-4 strips/day) with stock of only 8!
    const ctzQty = 2 + (dayIndex % 3);
    const ctzCust = customers[(day * 4) % customers.length];
    invoiceCounter++;
    sales.push({
      id: `sale-ctz-${day}`,
      saleNumber: `INV-${invoiceCounter}`,
      customerName: ctzCust,
      items: [
        {
          id: `si-ctz-${day}`,
          saleId: `sale-ctz-${day}`,
          medicineId: 'med-5',
          medicineName: 'Cetirizine 10mg Tablets',
          unit: 'strips',
          quantity: ctzQty,
          unitPrice: 22.0,
          subtotal: ctzQty * 22.0,
          batchAllocations: [{ batchId: 'batch-7', batchNumber: 'CTZ-512', quantity: ctzQty, expiryDate: '2027-08-15' }],
        }
      ],
      totalItems: 1,
      totalQuantity: ctzQty,
      totalAmount: ctzQty * 22.0,
      medicineId: 'med-5',
      medicineName: 'Cetirizine 10mg Tablets',
      quantity: ctzQty,
      unitPrice: 22.0,
      createdAt: new Date(new Date(dayDate).setHours(16 + (day % 3), 10, 0, 0)).toISOString(),
    });
  }

  // 6. Azithromycin 500mg: Sparse history (only 2 sales in 30 days) to test "Insufficient Historical Data"
  sales.push({
    id: 'sale-azi-1',
    saleNumber: `INV-${++invoiceCounter}`,
    customerName: 'Kunal Kapoor',
    items: [
      {
        id: 'si-azi-1',
        saleId: 'sale-azi-1',
        medicineId: 'med-6',
        medicineName: 'Azithromycin 500mg Tablets',
        unit: 'strips',
        quantity: 1,
        unitPrice: 95.0,
        subtotal: 95.0,
        batchAllocations: [{ batchId: 'batch-8', batchNumber: 'AZI-620', quantity: 1, expiryDate: '2027-07-20' }],
      }
    ],
    totalItems: 1,
    totalQuantity: 1,
    totalAmount: 95.0,
    medicineId: 'med-6',
    medicineName: 'Azithromycin 500mg Tablets',
    quantity: 1,
    unitPrice: 95.0,
    createdAt: new Date(now - 22 * oneDayMs).toISOString(),
  });
  sales.push({
    id: 'sale-azi-2',
    saleNumber: `INV-${++invoiceCounter}`,
    customerName: 'Shalini Gupta',
    items: [
      {
        id: 'si-azi-2',
        saleId: 'sale-azi-2',
        medicineId: 'med-6',
        medicineName: 'Azithromycin 500mg Tablets',
        unit: 'strips',
        quantity: 1,
        unitPrice: 95.0,
        subtotal: 95.0,
        batchAllocations: [{ batchId: 'batch-8', batchNumber: 'AZI-620', quantity: 1, expiryDate: '2027-07-20' }],
      }
    ],
    totalItems: 1,
    totalQuantity: 1,
    totalAmount: 95.0,
    medicineId: 'med-6',
    medicineName: 'Azithromycin 500mg Tablets',
    quantity: 1,
    unitPrice: 95.0,
    createdAt: new Date(now - 8 * oneDayMs).toISOString(),
  });

  // 7. med-7 (Ascoril D Cough Syrup) has 0 sales in the list -> exactly testing "No Sales History"!

  sales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return sales;
}

class InMemoryStore {
  private settings: ShopSettings = {
    shopName: 'Sri Sai Medical & General Store',
    pharmacistName: 'Store Pharmacist',
    nearExpiryDays: 30, // 30 days for Phase 2 strict near-expiry requirement
  };

  private purchaseRequests: PurchaseRequest[] = [
    {
      id: 'req-101',
      requestNumber: 'REQ-1001',
      medicineId: 'med-1',
      medicineName: 'Paracetamol 500mg Tablets',
      supplierId: 'sup-1',
      supplierName: 'ABC Pharma Distributors',
      currentStock: 18,
      forecastDemand: 120,
      recommendedQuantity: 132,
      priority: 'critical',
      reason: 'Current stock is 18 units, while projected demand is 120 units. After accounting for safety stock requirement, PharmaSync recommends purchasing 132 units.',
      forecastExplanation: 'Current stock is 18 units, while projected demand is 120 units. After accounting for safety stock requirement, PharmaSync recommends purchasing 132 units.',
      status: 'PENDING_ADMIN_APPROVAL',
      requestDate: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
      createdAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
      updatedAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    },
    {
      id: 'req-102',
      requestNumber: 'REQ-1002',
      medicineId: 'med-2',
      medicineName: 'Amoxicillin 500mg Capsules',
      supplierId: 'sup-2',
      supplierName: 'MedSupply Co.',
      currentStock: 12,
      forecastDemand: 50,
      recommendedQuantity: 60,
      priority: 'high',
      reason: 'Usable stock (12) is below minimum alert threshold (25).',
      forecastExplanation: 'Current stock is 12 units, while projected demand is 50 units. Reordering 60 units to satisfy baseline min stock requirements.',
      status: 'PENDING_ADMIN_APPROVAL',
      requestDate: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
      createdAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
      updatedAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
    },
  ];

  private supplierConversations: SupplierConversation[] = [];
  private supplierMessages: SupplierMessage[] = [];
  private notifications: InAppNotification[] = [
    {
      id: 'notif-1',
      recipientRole: 'admin',
      title: 'New Purchase Request',
      message: 'New stock purchase request generated: Paracetamol 500mg — 132 units',
      isRead: false,
      createdAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    },
  ];

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

  private sales: Sale[] = buildSeedHistoricalSales();

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
    const currentYear = new Date().getFullYear();
    const nextSeq = this.sales.length + 1;
    const saleNumber = `INV-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
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

  public getNextInvoiceNumber(): string {
    const currentYear = new Date().getFullYear();
    const nextSeq = this.sales.length + 1;
    return `INV-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
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
    const cleanName = data.name.trim();
    const existingMed = this.medicines.find((m) => m.name.toLowerCase() === cleanName.toLowerCase());
    if (existingMed) {
      throw new Error(`A medicine named "${existingMed.name}" already exists in the inventory (ID: ${existingMed.id}). Please replenish stock by adding a batch instead of duplicating the medicine.`);
    }
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

  // --- Phase 4: Analytics & Reporting Engines ---

  public getTodayPurchaseAmount(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.purchases
      .filter((p) => new Date(p.createdAt) >= today)
      .reduce((sum, p) => sum + p.totalAmount, 0);
  }

  public getMonthSalesAmount(): number {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return this.sales
      .filter((s) => new Date(s.createdAt) >= startOfMonth)
      .reduce((sum, s) => sum + s.totalAmount, 0);
  }

  public getRecentSalesTrend(days = 7): { date: string; label: string; amount: number; count: number }[] {
    const result: { date: string; label: string; amount: number; count: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      const daySales = this.sales.filter((s) => s.createdAt.startsWith(dateStr));
      const amount = daySales.reduce((sum, s) => sum + s.totalAmount, 0);
      const count = daySales.length;

      result.push({ date: dateStr, label, amount, count });
    }

    return result;
  }

  public getCategoryDistribution(): { category: string; medicineCount: number; usableStock: number; totalValue: number }[] {
    const enriched = this.getAllMedicines();
    const map = new Map<string, { medicineCount: number; usableStock: number; totalValue: number }>();

    for (const m of enriched) {
      const cur = map.get(m.category) || { medicineCount: 0, usableStock: 0, totalValue: 0 };
      cur.medicineCount += 1;
      cur.usableStock += m.usableStock;
      cur.totalValue += m.usableStock * m.sellingPrice;
      map.set(m.category, cur);
    }

    return Array.from(map.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.usableStock - a.usableStock);
  }

  public getDashboardAnalytics() {
    const enriched = this.getAllMedicines();
    const alerts = this.getInventoryAlerts();
    const settings = this.getSettings();

    const totalMedicines = enriched.length;
    const availableStock = enriched.reduce((sum, m) => sum + m.usableStock, 0);
    const todaySalesAmount = this.getTodaySalesAmount();
    const todayPurchaseAmount = this.getTodayPurchaseAmount();
    const monthSalesAmount = this.getMonthSalesAmount();
    const salesTrend7Days = this.getRecentSalesTrend(7);
    const categoryDistribution = this.getCategoryDistribution();

    const summary = {
      totalMedicines,
      availableStock,
      lowStockCount: alerts.summary.lowStockCount,
      outOfStockCount: alerts.summary.outOfStockCount,
      todaySalesAmount,
      todayPurchaseAmount,
      nearExpiryBatchCount: alerts.summary.nearExpiryBatchCount,
      expiredBatchCount: alerts.summary.expiredBatchCount,
      monthSalesAmount,
    };

    return {
      summary,
      metrics: summary,
      salesTrend7Days,
      categoryDistribution,
      lowStockMedicines: alerts.lowStockMedicines.slice(0, 5).map((m) => ({
        id: m.id,
        name: m.name,
        category: m.category,
        totalStock: m.usableStock,
        minStock: m.minStockLevel,
        unit: m.unit,
      })),
      nearExpiryBatches: alerts.nearExpiryBatches.slice(0, 5),
      recentSales: this.sales.slice(0, 5),
      recentPurchases: this.purchases.slice(0, 5),
      settings,
    };
  }

  public getSalesAnalytics(params?: { startDate?: string; endDate?: string; groupBy?: 'day' | 'week' | 'month' }) {
    let filtered = [...this.sales];

    if (params?.startDate) {
      filtered = filtered.filter((s) => s.createdAt >= params.startDate!);
    }
    if (params?.endDate) {
      const end = params.endDate.includes('T') ? params.endDate : `${params.endDate}T23:59:59.999Z`;
      filtered = filtered.filter((s) => s.createdAt <= end);
    }

    const totalSalesAmount = filtered.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalItemsSold = filtered.reduce((sum, s) => sum + (s.totalQuantity || s.quantity || 0), 0);
    const totalTransactions = filtered.length;
    const averageOrderValue = totalTransactions > 0 ? totalSalesAmount / totalTransactions : 0;

    const groupBy = params?.groupBy || 'day';
    const groupMap = new Map<string, { label: string; totalAmount: number; totalItems: number; transactionCount: number }>();

    for (const s of filtered) {
      const d = new Date(s.createdAt);
      let key = '';
      let label = '';

      if (groupBy === 'month') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      } else if (groupBy === 'week') {
        const firstDay = new Date(d);
        firstDay.setDate(d.getDate() - d.getDay());
        key = firstDay.toISOString().split('T')[0];
        label = `Wk of ${firstDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      } else {
        key = d.toISOString().split('T')[0];
        label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      const cur = groupMap.get(key) || { label, totalAmount: 0, totalItems: 0, transactionCount: 0 };
      cur.totalAmount += s.totalAmount;
      cur.totalItems += s.totalQuantity || s.quantity || 0;
      cur.transactionCount += 1;
      groupMap.set(key, cur);
    }

    const trend = Array.from(groupMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      summary: {
        totalSalesAmount,
        totalItemsSold,
        totalTransactions,
        averageOrderValue,
      },
      trend,
    };
  }

  public getInventoryAnalytics() {
    const enriched = this.getAllMedicines();
    const alerts = this.getInventoryAlerts();
    const categoryDistribution = this.getCategoryDistribution();

    const totalMedicines = enriched.length;
    const totalUsableStock = enriched.reduce((sum, m) => sum + m.usableStock, 0);
    const totalExpiredStock = enriched.reduce((sum, m) => sum + m.expiredStock, 0);
    const totalInventoryValue = enriched.reduce((sum, m) => sum + m.usableStock * m.sellingPrice, 0);

    return {
      summary: {
        totalMedicines,
        totalUsableStock,
        totalExpiredStock,
        totalInventoryValue,
        lowStockCount: alerts.summary.lowStockCount,
        outOfStockCount: alerts.summary.outOfStockCount,
        nearExpiryBatchCount: alerts.summary.nearExpiryBatchCount,
        expiredBatchCount: alerts.summary.expiredBatchCount,
      },
      categoryDistribution,
      lowStockMedicines: alerts.lowStockMedicines,
      outOfStockMedicines: alerts.outOfStockMedicines,
      nearExpiryBatches: alerts.nearExpiryBatches,
      expiredBatches: alerts.expiredBatches,
    };
  }

  public getPurchaseAnalytics(params?: { startDate?: string; endDate?: string }) {
    let filtered = [...this.purchases];

    if (params?.startDate) {
      filtered = filtered.filter((p) => p.createdAt >= params.startDate!);
    }
    if (params?.endDate) {
      const end = params.endDate.includes('T') ? params.endDate : `${params.endDate}T23:59:59.999Z`;
      filtered = filtered.filter((p) => p.createdAt <= end);
    }

    const totalPurchasesCount = filtered.length;
    const totalPurchaseAmount = filtered.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalUnitsPurchased = filtered.reduce((sum, p) => sum + p.totalQuantity, 0);

    // Group by supplier
    const suppMap = new Map<string, { supplierName: string; purchaseCount: number; totalAmount: number; totalQuantity: number }>();
    for (const p of filtered) {
      const cur = suppMap.get(p.supplierId) || { supplierName: p.supplierName, purchaseCount: 0, totalAmount: 0, totalQuantity: 0 };
      cur.purchaseCount += 1;
      cur.totalAmount += p.totalAmount;
      cur.totalQuantity += p.totalQuantity;
      suppMap.set(p.supplierId, cur);
    }

    const purchasesBySupplier = Array.from(suppMap.entries())
      .map(([supplierId, data]) => ({ supplierId, ...data }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    // Timeline
    const dateMap = new Map<string, { label: string; totalAmount: number; totalQuantity: number; count: number }>();
    for (const p of filtered) {
      const dateStr = p.createdAt.split('T')[0];
      const d = new Date(p.createdAt);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const cur = dateMap.get(dateStr) || { label, totalAmount: 0, totalQuantity: 0, count: 0 };
      cur.totalAmount += p.totalAmount;
      cur.totalQuantity += p.totalQuantity;
      cur.count += 1;
      dateMap.set(dateStr, cur);
    }

    const timeline = Array.from(dateMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      summary: {
        totalPurchasesCount,
        totalPurchaseAmount,
        totalUnitsPurchased,
      },
      purchasesBySupplier,
      timeline,
      recentPurchases: filtered.slice(0, 10),
    };
  }

  // --- Reports Data Generators ---

  public getSalesReportData(params?: { startDate?: string; endDate?: string }) {
    let list = [...this.sales];
    if (params?.startDate) {
      list = list.filter((s) => s.createdAt >= params.startDate!);
    }
    if (params?.endDate) {
      const end = params.endDate.includes('T') ? params.endDate : `${params.endDate}T23:59:59.999Z`;
      list = list.filter((s) => s.createdAt <= end);
    }

    return list.map((s) => ({
      saleId: s.saleNumber || s.id,
      date: s.createdAt,
      customer: s.customerName || 'Walk-in Customer',
      numberOfItems: s.items ? s.items.length : 1,
      totalQuantity: s.totalQuantity || s.quantity || 0,
      totalAmount: s.totalAmount,
    }));
  }

  public getInventoryReportData(params?: { category?: string; stockStatus?: string }) {
    let list = this.getAllMedicines();
    if (params?.category) {
      list = list.filter((m) => m.category.toLowerCase() === params.category!.toLowerCase());
    }
    if (params?.stockStatus) {
      list = list.filter((m) => m.stockStatus.toLowerCase() === params.stockStatus!.toLowerCase());
    }

    return list.map((m) => ({
      medicineName: m.name,
      genericName: m.genericName || 'N/A',
      category: m.category,
      unit: m.unit,
      availableStock: m.usableStock,
      minStockLevel: m.minStockLevel,
      sellingPrice: m.sellingPrice,
      stockStatus: m.stockStatus,
    }));
  }

  public getExpiryReportData(status?: 'all' | 'near_expiry' | 'expired') {
    const alerts = this.getInventoryAlerts();
    let rows: {
      medicineName: string;
      category: string;
      batchNumber: string;
      batchQuantity: number;
      expiryDate: string;
      daysRemaining: number;
      expiryStatus: 'Expired' | 'Near Expiry';
    }[] = [];

    if (status !== 'expired') {
      rows = rows.concat(
        alerts.nearExpiryBatches.map((b) => {
          const med = this.medicines.find((m) => m.id === b.medicineId);
          return {
            medicineName: b.medicineName,
            category: med?.category || 'General',
            batchNumber: b.batchNumber,
            batchQuantity: b.quantity,
            expiryDate: b.expiryDate,
            daysRemaining: b.daysRemaining,
            expiryStatus: 'Near Expiry' as const,
          };
        })
      );
    }

    if (status !== 'near_expiry') {
      rows = rows.concat(
        alerts.expiredBatches.map((b) => {
          const med = this.medicines.find((m) => m.id === b.medicineId);
          return {
            medicineName: b.medicineName,
            category: med?.category || 'General',
            batchNumber: b.batchNumber,
            batchQuantity: b.quantity,
            expiryDate: b.expiryDate,
            daysRemaining: b.daysRemaining,
            expiryStatus: 'Expired' as const,
          };
        })
      );
    }

    rows.sort((a, b) => a.daysRemaining - b.daysRemaining);
    return rows;
  }

  public getPurchaseReportData(params?: { supplierId?: string; startDate?: string; endDate?: string }) {
    let list = [...this.purchases];
    if (params?.supplierId) {
      list = list.filter((p) => p.supplierId === params.supplierId);
    }
    if (params?.startDate) {
      list = list.filter((p) => p.createdAt >= params.startDate!);
    }
    if (params?.endDate) {
      const end = params.endDate.includes('T') ? params.endDate : `${params.endDate}T23:59:59.999Z`;
      list = list.filter((p) => p.createdAt <= end);
    }

    return list.map((p) => ({
      purchaseId: p.purchaseNumber || p.id,
      supplierName: p.supplierName,
      date: p.createdAt,
      numberOfItems: p.items.length,
      totalQuantity: p.totalQuantity,
      totalAmount: p.totalAmount,
    }));
  }

  public async confirmBillPurchase(data: ConfirmBillInput): Promise<ConfirmBillResult> {
    if (!data.items || data.items.length === 0) {
      throw new Error('At least one medicine item is required to record the bill.');
    }

    const cleanInvoiceNumber = (data.invoiceNumber || '').trim();
    if (!cleanInvoiceNumber) {
      throw new Error('Invoice / Bill number is required.');
    }

    // Duplicate check
    const existing = this.purchases.find(
      (p) =>
        (p.purchaseNumber && p.purchaseNumber.toLowerCase().includes(cleanInvoiceNumber.toLowerCase())) ||
        (p.notes && p.notes.toLowerCase().includes(cleanInvoiceNumber.toLowerCase()))
    );

    if (existing) {
      throw new Error(
        `Invoice #${cleanInvoiceNumber} has already been recorded (Order: ${existing.purchaseNumber}). Duplicate invoice processing is blocked.`
      );
    }

    // Resolve supplier
    let supplier = this.suppliers.find((s) => s.id === data.supplierId);
    if (!supplier && data.supplierName) {
      supplier = this.suppliers.find(
        (s) => s.name.toLowerCase() === data.supplierName.trim().toLowerCase()
      );
    }
    if (!supplier) {
      supplier = {
        id: `supp-${Date.now()}`,
        name: data.supplierName?.trim() || 'General Supplier',
        phone: data.supplierPhone?.trim() || 'N/A',
        email: data.supplierEmail?.trim(),
        address: data.supplierAddress?.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.suppliers.push(supplier);
    }

    const newMedicinesCreated: { id: string; name: string; category: string }[] = [];
    const batchesCreated: { id: string; medicineId: string; batchNumber: string; quantity: number }[] = [];
    const purchaseItems: PurchaseItem[] = [];

    let totalQuantity = 0;
    let totalAmount = 0;
    const now = new Date().toISOString();
    const todayStr = now.split('T')[0];

    const poNumber = `INV-${cleanInvoiceNumber}-${1001 + this.purchases.length}`;
    const purchaseId = `purchase-${Date.now()}`;

    for (const item of data.items) {
      const qty = Math.round(Number(item.quantity));
      if (!qty || qty <= 0) throw new Error(`Quantity for "${item.name}" must be greater than 0.`);

      const pPrice = Number(item.purchasePrice);
      if (isNaN(pPrice) || pPrice < 0) throw new Error(`Purchase price for "${item.name}" must be non-negative.`);

      const batchNum = (item.batchNumber || '').trim().toUpperCase();
      if (!batchNum) throw new Error(`Batch number is required for "${item.name}".`);

      const expiry = (item.expiryDate || '').trim();
      if (!expiry || !/^\d{4}-\d{2}-\d{2}$/.test(expiry)) {
        throw new Error(`Valid expiry date (YYYY-MM-DD) is required for "${item.name}".`);
      }
      if (expiry < todayStr) {
        throw new Error(`Medicine "${item.name}" batch ${batchNum} has an expired date (${expiry}).`);
      }

      let med = this.medicines.find(
        (m) =>
          (item.medicineId && m.id === item.medicineId) ||
          m.name.toLowerCase() === item.name.trim().toLowerCase()
      );

      if (!med || item.isNewMedicine) {
        const sellPrice = item.sellingPrice && Number(item.sellingPrice) > 0
          ? Number(item.sellingPrice)
          : Math.round(pPrice * 1.3 * 100) / 100 || 10;

        med = {
          id: `med-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: item.name.trim(),
          genericName: item.genericName?.trim(),
          category: item.category?.trim() || 'General',
          manufacturer: item.manufacturer?.trim(),
          description: item.description?.trim(),
          unit: item.unit?.trim() || 'tablets',
          minStockLevel: item.minStockLevel || 10,
          purchasePrice: pPrice,
          sellingPrice: sellPrice,
          createdAt: now,
          updatedAt: now,
        };
        this.medicines.push(med);
        newMedicinesCreated.push({ id: med.id, name: med.name, category: med.category });
      }

      // Upsert batch
      let batch = this.batches.find(
        (b) => b.medicineId === med!.id && b.batchNumber.toLowerCase() === batchNum.toLowerCase()
      );

      if (batch) {
        batch.quantity += qty;
        batch.expiryDate = expiry;
        if (item.mfgDate) batch.mfgDate = item.mfgDate;
        batch.updatedAt = now;
      } else {
        batch = {
          id: `batch-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          medicineId: med.id,
          batchNumber: batchNum,
          quantity: qty,
          expiryDate: expiry,
          mfgDate: item.mfgDate,
          createdAt: now,
          updatedAt: now,
        };
        this.batches.push(batch);
      }

      batchesCreated.push({
        id: batch.id,
        medicineId: med.id,
        batchNumber: batchNum,
        quantity: qty,
      });

      // Stock movement audit
      this.stockMovements.unshift({
        id: `sm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        medicineId: med.id,
        batchId: batch.id,
        batchNumber: batchNum,
        movementType: 'Stock Added',
        quantity: qty,
        reason: `Purchase Bill #${cleanInvoiceNumber} (AI Scanned entry)`,
        createdAt: now,
      });

      const subtotal = Math.round(qty * pPrice * 100) / 100;
      totalQuantity += qty;
      totalAmount += subtotal;

      purchaseItems.push({
        id: `pi-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        purchaseId,
        medicineId: med.id,
        medicineName: med.name,
        batchId: batch.id,
        batchNumber: batchNum,
        quantity: qty,
        purchasePrice: pPrice,
        subtotal,
        expiryDate: expiry,
        mfgDate: item.mfgDate,
      });
    }

    const createdPurchase: Purchase = {
      id: purchaseId,
      purchaseNumber: poNumber,
      supplierId: supplier.id,
      supplierName: supplier.name,
      items: purchaseItems,
      totalQuantity,
      totalAmount: Math.round(totalAmount * 100) / 100,
      notes: `AI Scanned Bill Invoice #${cleanInvoiceNumber}${data.notes ? ` | ${data.notes.trim()}` : ''}`,
      createdAt: now,
    };

    this.purchases.unshift(createdPurchase);

    return {
      purchase: createdPurchase,
      newMedicinesCreated,
      batchesCreated,
      totalQuantity,
      totalAmount: Math.round(totalAmount * 100) / 100,
    };
  }

  // ---------------------------------------------------------------------------
  // PROCUREMENT & ADMIN APPROVAL WORKFLOW
  // ---------------------------------------------------------------------------
  public async getAllPurchaseRequests(filter?: { status?: string; medicineId?: string }): Promise<PurchaseRequest[]> {
    let list = [...this.purchaseRequests];
    if (filter?.status) {
      list = list.filter((r) => r.status === filter.status);
    }
    if (filter?.medicineId) {
      list = list.filter((r) => r.medicineId === filter.medicineId);
    }
    return list;
  }

  public async getPurchaseRequestById(id: string): Promise<PurchaseRequest | null> {
    return this.purchaseRequests.find((r) => r.id === id || r.requestNumber === id) || null;
  }

  public async generatePurchaseRequestFromRecommendation(data: {
    medicineId: string;
    medicineName: string;
    currentStock: number;
    forecastDemand: number;
    recommendedQuantity: number;
    priority?: 'critical' | 'high' | 'medium' | 'low';
    reason?: string;
    forecastExplanation?: string;
    supplierId?: string;
    supplierName?: string;
  }): Promise<PurchaseRequest | null> {
    // Check duplicate: active request/order already exists for this medicine
    const activeStatus = ['PENDING_ADMIN_APPROVAL', 'APPROVED', 'ORDER_SENT', 'SUPPLIER_RESPONDED', 'ORDER_CONFIRMED'];
    const existingActive = this.purchaseRequests.find(
      (r) => r.medicineId === data.medicineId && activeStatus.includes(r.status)
    );
    if (existingActive) {
      return existingActive;
    }

    const supplier = data.supplierId
      ? this.suppliers.find((s) => s.id === data.supplierId)
      : this.suppliers[0];
    const supplierId = supplier ? supplier.id : 'sup-1';
    const supplierName = supplier ? supplier.name : (data.supplierName || 'ABC Pharma Distributors');

    const nextIdNum = 1000 + this.purchaseRequests.length + 1;
    const reqNumber = `REQ-${nextIdNum}`;
    const now = new Date().toISOString();

    const explanation = data.forecastExplanation ||
      `Current stock is ${data.currentStock} units, while projected demand is ${data.forecastDemand} units. After accounting for safety stock requirement, PharmaSync recommends purchasing ${data.recommendedQuantity} units.`;

    const newReq: PurchaseRequest = {
      id: `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      requestNumber: reqNumber,
      medicineId: data.medicineId,
      medicineName: data.medicineName,
      supplierId,
      supplierName,
      currentStock: data.currentStock,
      forecastDemand: data.forecastDemand,
      recommendedQuantity: data.recommendedQuantity,
      priority: data.priority || 'medium',
      reason: data.reason || 'Reorder threshold triggered by demand forecast.',
      forecastExplanation: explanation,
      status: 'PENDING_ADMIN_APPROVAL',
      requestDate: now,
      createdAt: now,
      updatedAt: now,
    };

    this.purchaseRequests.unshift(newReq);

    // Notify Admin
    this.notifications.unshift({
      id: `notif-${Date.now()}`,
      recipientRole: 'admin',
      title: 'New Purchase Request',
      message: `New stock purchase request: ${newReq.medicineName} — ${newReq.recommendedQuantity} units`,
      isRead: false,
      createdAt: now,
    });

    return newReq;
  }

  public async approvePurchaseRequest(
    id: string,
    approvedBy = 'Admin (Store Manager)'
  ): Promise<{ request: PurchaseRequest; conversation: SupplierConversation }> {
    const reqIndex = this.purchaseRequests.findIndex((r) => r.id === id || r.requestNumber === id);
    if (reqIndex === -1) {
      throw new Error(`Purchase request with ID "${id}" not found.`);
    }

    const req = this.purchaseRequests[reqIndex];
    if (req.status !== 'PENDING_ADMIN_APPROVAL') {
      throw new Error(`Cannot approve request in status "${req.status}". Must be PENDING_ADMIN_APPROVAL.`);
    }

    const now = new Date().toISOString();
    req.status = 'APPROVED';
    req.approvedAt = now;
    req.approvedBy = approvedBy;
    req.updatedAt = now;

    // Start AI Supplier Conversation
    const convId = `conv-${Date.now()}`;
    const orderNumber = `PO-${1100 + this.supplierConversations.length + 1}`;

    const initialAiMessageText = supplierAgentService.generateOrderMessage(req);

    const conversation: SupplierConversation = {
      id: convId,
      purchaseRequestId: req.id,
      supplierId: req.supplierId,
      supplierName: req.supplierName,
      medicineId: req.medicineId,
      medicineName: req.medicineName,
      requestedQuantity: req.recommendedQuantity,
      orderNumber,
      status: 'ORDER_SENT',
      createdAt: now,
      updatedAt: now,
    };

    const firstMsg: SupplierMessage = {
      id: `msg-${Date.now()}`,
      conversationId: convId,
      senderType: 'ai',
      message: initialAiMessageText,
      messageType: 'order_request',
      createdAt: now,
    };

    req.status = 'ORDER_SENT';

    this.supplierConversations.unshift(conversation);
    this.supplierMessages.push(firstMsg);

    // Add Notification for Pharmacist and Admin
    this.notifications.unshift({
      id: `notif-${Date.now()}-1`,
      recipientRole: 'all',
      title: 'Order Sent to Supplier',
      message: `Purchase request approved for ${req.medicineName}. Order #${orderNumber} sent to ${req.supplierName}.`,
      isRead: false,
      createdAt: now,
    });

    return { request: req, conversation };
  }

  public async rejectPurchaseRequest(id: string, rejectionReason: string): Promise<PurchaseRequest> {
    const reqIndex = this.purchaseRequests.findIndex((r) => r.id === id || r.requestNumber === id);
    if (reqIndex === -1) {
      throw new Error(`Purchase request with ID "${id}" not found.`);
    }

    const req = this.purchaseRequests[reqIndex];
    if (req.status !== 'PENDING_ADMIN_APPROVAL') {
      throw new Error(`Cannot reject request in status "${req.status}".`);
    }

    const now = new Date().toISOString();
    req.status = 'REJECTED';
    req.rejectedAt = now;
    req.rejectionReason = rejectionReason || 'Rejected by Admin.';
    req.updatedAt = now;

    this.notifications.unshift({
      id: `notif-${Date.now()}`,
      recipientRole: 'pharmacist',
      title: 'Purchase Request Rejected',
      message: `Purchase request for ${req.medicineName} was rejected by Admin. Reason: ${req.rejectionReason}`,
      isRead: false,
      createdAt: now,
    });

    return req;
  }

  public async getSupplierConversations(): Promise<SupplierConversation[]> {
    return this.supplierConversations;
  }

  public async getSupplierConversationById(id: string): Promise<SupplierConversation | null> {
    return this.supplierConversations.find((c) => c.id === id || c.purchaseRequestId === id) || null;
  }

  public async getSupplierMessages(conversationId: string): Promise<SupplierMessage[]> {
    return this.supplierMessages.filter((m) => m.conversationId === conversationId);
  }

  public async sendSupplierMessage(
    conversationId: string,
    messageText: string,
    senderType: 'supplier' | 'ai' | 'system' = 'supplier'
  ): Promise<{ conversation: SupplierConversation; messages: SupplierMessage[] }> {
    const conv = this.supplierConversations.find((c) => c.id === conversationId);
    if (!conv) {
      throw new Error(`Supplier conversation with ID "${conversationId}" not found.`);
    }

    const now = new Date().toISOString();
    const userMsg: SupplierMessage = {
      id: `msg-${Date.now()}`,
      conversationId: conv.id,
      senderType,
      message: messageText,
      messageType: 'text',
      createdAt: now,
    };
    this.supplierMessages.push(userMsg);

    // If sender is supplier, process with supplierAgentService
    if (senderType === 'supplier') {
      const extracted = supplierAgentService.extractOrderDetails(messageText, conv.requestedQuantity);
      conv.extractedData = { ...(conv.extractedData || {}), ...extracted };

      const req = this.purchaseRequests.find((r) => r.id === conv.purchaseRequestId);

      const followUp = supplierAgentService.generateFollowUp(extracted, conv.requestedQuantity, conv.medicineName);

      if (followUp.requiresFollowUp) {
        conv.status = 'SUPPLIER_RESPONDED';
        if (req) req.status = 'SUPPLIER_RESPONDED';

        const aiFollowUpMsg: SupplierMessage = {
          id: `msg-${Date.now() + 1}`,
          conversationId: conv.id,
          senderType: 'ai',
          message: followUp.followUpMessage,
          messageType: 'text',
          createdAt: new Date(Date.now() + 100).toISOString(),
        };
        this.supplierMessages.push(aiFollowUpMsg);
      } else if (extracted.isConfirmed) {
        conv.status = 'ORDER_CONFIRMED';
        if (req) {
          req.status = 'ORDER_CONFIRMED';
          req.unitPrice = extracted.unitPrice;
          req.totalPrice = extracted.totalPrice;
          req.expectedDelivery = extracted.expectedDelivery;
        }

        const summaryText = supplierAgentService.formatOrderConfirmationSummary(extracted, conv.requestedQuantity);

        const aiConfirmMsg: SupplierMessage = {
          id: `msg-${Date.now() + 1}`,
          conversationId: conv.id,
          senderType: 'ai',
          message: summaryText,
          messageType: 'confirmation_summary',
          extractedData: extracted,
          createdAt: new Date(Date.now() + 100).toISOString(),
        };
        this.supplierMessages.push(aiConfirmMsg);

        // Notify Pharmacist of Order Confirmation
        this.notifications.unshift({
          id: `notif-${Date.now()}`,
          recipientRole: 'pharmacist',
          title: 'Supplier Confirmed Order',
          message: `Supplier confirmed order: ${conv.medicineName} — ${conv.requestedQuantity} units`,
          isRead: false,
          createdAt: now,
        });
      }
    }

    conv.updatedAt = now;

    const messages = this.supplierMessages.filter((m) => m.conversationId === conv.id);
    return { conversation: conv, messages };
  }

  public async getNotifications(role?: string): Promise<InAppNotification[]> {
    if (!role || role === 'all') {
      return this.notifications;
    }
    return this.notifications.filter((n) => n.recipientRole === role || n.recipientRole === 'all');
  }

  public async markNotificationRead(id: string): Promise<boolean> {
    const notif = this.notifications.find((n) => n.id === id);
    if (notif) {
      notif.isRead = true;
      return true;
    }
    return false;
  }

  public async getProcurementSummary(): Promise<{
    pendingAdminApprovalCount: number;
    ordersSentCount: number;
    ordersConfirmedCount: number;
  }> {
    const pendingAdminApprovalCount = this.purchaseRequests.filter(
      (r) => r.status === 'PENDING_ADMIN_APPROVAL'
    ).length;
    const ordersSentCount = this.supplierConversations.filter(
      (c) => c.status === 'ORDER_SENT' || c.status === 'SUPPLIER_RESPONDED'
    ).length;
    const ordersConfirmedCount = this.supplierConversations.filter(
      (c) => c.status === 'ORDER_CONFIRMED'
    ).length;

    return {
      pendingAdminApprovalCount,
      ordersSentCount,
      ordersConfirmedCount,
    };
  }
}

export const inMemoryStore = new InMemoryStore();

