import { Router } from 'express';
import {
  getInventory,
  addMedicine,
  updateMedicine,
  deleteMedicine,
  getDashboardOverview,
} from '../controllers/inventoryController.js';

const router = Router();

router.get('/', getInventory);
router.post('/', addMedicine);
router.get('/dashboard', getDashboardOverview);
router.put('/:id', updateMedicine);
router.delete('/:id', deleteMedicine);

export default router;
