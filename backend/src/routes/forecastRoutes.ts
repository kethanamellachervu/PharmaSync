import { Router } from 'express';
import {
  getForecastOverview,
  getMedicineForecasts,
  getMedicineForecastById,
  getForecastSettings,
  updateForecastSettings,
} from '../controllers/forecastController.js';

const router = Router();

// Forecast overview KPI summary
router.get('/overview', getForecastOverview);

// Forecast for all medicines (with filters)
router.get('/medicines', getMedicineForecasts);

// Single medicine detailed historical vs projected forecast
router.get('/medicines/:id', getMedicineForecastById);

// Forecasting settings
router.get('/settings', getForecastSettings);
router.put('/settings', updateForecastSettings);

export default router;
