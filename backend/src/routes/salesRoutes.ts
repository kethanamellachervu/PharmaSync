import { Router } from 'express';
import { getSales, getSaleById, recordSale } from '../controllers/salesController.js';

const router = Router();

router.get('/', getSales);
router.get('/:id', getSaleById);
router.post('/', recordSale);

export default router;
