import { Router } from 'express';
import {
  getDashboardAnalytics,
  getSalesAnalytics,
  getInventoryAnalytics,
  getPurchasesAnalytics,
} from '../controllers/analyticsController.js';

const router = Router();

router.get('/dashboard', getDashboardAnalytics);
router.get('/sales', getSalesAnalytics);
router.get('/inventory', getInventoryAnalytics);
router.get('/purchases', getPurchasesAnalytics);

export default router;
