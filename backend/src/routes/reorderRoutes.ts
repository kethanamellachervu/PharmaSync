import { Router } from 'express';
import {
  getReorderRecommendations,
  reviewReorderRecommendation,
} from '../controllers/forecastController.js';

const router = Router();

// Reorder recommendations list (with urgency/category/review filters)
router.get('/', getReorderRecommendations);
router.get('/recommendations', getReorderRecommendations);

// Update review status for a specific reorder recommendation
router.patch('/recommendations/:id/review', reviewReorderRecommendation);

export default router;
