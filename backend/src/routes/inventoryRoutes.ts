import { Router } from 'express';
import {
  getInventory,
  getMedicineById,
  addMedicine,
  updateMedicine,
  deleteMedicine,
  getBatches,
  addBatch,
  updateBatch,
  getStockMovements,
  getInventoryAlerts,
  allocateFefoStock,
  getDatabaseStatus,
  getDashboardOverview,
} from '../controllers/inventoryController.js';

const router = Router();

// Dashboard & alerts
router.get('/dashboard', getDashboardOverview);
router.get('/alerts', getInventoryAlerts);
router.get('/database-status', getDatabaseStatus);

// Movements (global or by medicine)
router.get('/movements', getStockMovements);

// FEFO allocation simulation/execution
router.post('/fefo-allocate', allocateFefoStock);

// Medicines CRUD
router.get('/', getInventory);
router.post('/', addMedicine);
router.get('/:id', getMedicineById);
router.put('/:id', updateMedicine);
router.delete('/:id', deleteMedicine);

// Batches & Movements for specific medicine
router.get('/:id/batches', getBatches);
router.post('/:id/batches', addBatch);
router.put('/:id/batches/:batchId', updateBatch);
router.get('/:id/movements', getStockMovements);

export default router;
