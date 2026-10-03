import { Router } from 'express';
import { getSales, recordSale } from '../controllers/salesController.js';

const router = Router();

router.get('/', getSales);
router.post('/', recordSale);

export default router;
