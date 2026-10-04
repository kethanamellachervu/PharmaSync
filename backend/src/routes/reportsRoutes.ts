import { Router } from 'express';
import {
  getSalesReport,
  getInventoryReport,
  getExpiryReport,
  getPurchasesReport,
} from '../controllers/reportsController.js';

const router = Router();

router.get('/sales', getSalesReport);
router.get('/inventory', getInventoryReport);
router.get('/expiry', getExpiryReport);
router.get('/purchases', getPurchasesReport);

export default router;
