import { Router } from 'express';
import {
  getPurchases,
  getPurchaseById,
  createPurchase,
} from '../controllers/purchaseController.js';

const router = Router();

router.get('/', getPurchases);
router.get('/:id', getPurchaseById);
router.post('/', createPurchase);

export default router;
