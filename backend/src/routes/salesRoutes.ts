import { Router } from 'express';
import { getSales, getSaleById, recordSale, getNextInvoice } from '../controllers/salesController.js';

const router = Router();

router.get('/', getSales);
router.get('/next-invoice', getNextInvoice);
router.get('/:id', getSaleById);
router.post('/', recordSale);

export default router;
