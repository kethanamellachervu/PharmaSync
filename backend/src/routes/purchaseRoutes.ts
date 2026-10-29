import { Router } from 'express';
import {
  getPurchases,
  getPurchaseById,
  createPurchase,
} from '../controllers/purchaseController.js';
import {
  scanBill,
  confirmBill,
  getOcrStatus,
  getScanProgress,
  billUploadMiddleware,
} from '../controllers/billScanController.js';

const router = Router();

// AI Bill Scanning & Processing routes
router.get('/ocr-status', getOcrStatus);
router.get('/ocr/status', getOcrStatus);
router.get('/scan-progress/:scanId', getScanProgress);
router.post('/scan-bill', billUploadMiddleware, scanBill);
router.post('/confirm-bill', confirmBill);

// Standard Purchase routes
router.get('/', getPurchases);
router.get('/:id', getPurchaseById);
router.post('/', createPurchase);

export default router;
