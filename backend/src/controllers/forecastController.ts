import { Request, Response, NextFunction } from 'express';
import {
  forecastingService,
  DemandTrend,
  ReorderUrgency,
  ReviewStatus,
} from '../services/forecastingService.js';
import { pharmacyStore } from '../services/pharmacyStore.js';

export async function getForecastOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const horizon = req.query.period
      ? Number(req.query.period)
      : req.query.horizon
      ? Number(req.query.horizon)
      : req.query.horizonDays
      ? Number(req.query.horizonDays)
      : undefined;
    const overview = await forecastingService.getForecastOverview(horizon);

    res.status(200).json({
      status: 'success',
      data: overview,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMedicineForecasts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const search = req.query.search as string | undefined;
    const trend = req.query.trend as DemandTrend | 'all' | undefined;
    const urgency = req.query.urgency as ReorderUrgency | 'all' | undefined;
    const period = req.query.period
      ? Number(req.query.period)
      : req.query.horizon
      ? Number(req.query.horizon)
      : req.query.horizonDays
      ? Number(req.query.horizonDays)
      : 30;

    const medicines = await pharmacyStore.getAllMedicines();
    const allSales = await pharmacyStore.getAllSales();
    let forecasts = await Promise.all(
      medicines.map((m) =>
        forecastingService.calculateMedicineForecast(m.id, period, m, allSales)
      )
    );

    // Apply search filter
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      forecasts = forecasts.filter(
        (f) =>
          f.medicineName.toLowerCase().includes(q) ||
          (f.genericName && f.genericName.toLowerCase().includes(q)) ||
          f.category.toLowerCase().includes(q) ||
          f.medicineId.toLowerCase().includes(q)
      );
    }

    // Apply trend filter
    if (trend && trend !== 'all') {
      forecasts = forecasts.filter((f) => f.demandTrend === trend);
    }

    // Apply urgency filter
    if (urgency && urgency !== 'all') {
      forecasts = forecasts.filter((f) => f.urgency === urgency);
    }

    res.status(200).json({
      status: 'success',
      total: forecasts.length,
      period,
      data: forecasts,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMedicineForecastById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const period = req.query.period
      ? Number(req.query.period)
      : req.query.horizon
      ? Number(req.query.horizon)
      : req.query.horizonDays
      ? Number(req.query.horizonDays)
      : undefined;

    const med = await pharmacyStore.getMedicineById(id);
    if (!med) {
      res.status(404).json({
        status: 'error',
        message: `Medicine with ID "${id}" not found.`,
      });
      return;
    }

    const detail = await forecastingService.getMedicineForecastDetail(id, period);
    res.status(200).json({
      status: 'success',
      data: detail,
    });
  } catch (error) {
    next(error);
  }
}

export async function getReorderRecommendations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const urgency = req.query.urgency as ReorderUrgency | 'all' | undefined;
    const category = req.query.category as string | undefined;
    const stockStatus = req.query.stockStatus as string | undefined;
    const reviewStatus = req.query.reviewStatus as ReviewStatus | 'all' | undefined;
    const horizonDays = req.query.horizonDays
      ? Number(req.query.horizonDays)
      : req.query.horizon
      ? Number(req.query.horizon)
      : req.query.period
      ? Number(req.query.period)
      : undefined;

    const recommendations = await forecastingService.getReorderRecommendations({
      urgency,
      category,
      stockStatus,
      reviewStatus,
      horizonDays,
    });

    res.status(200).json({
      status: 'success',
      total: recommendations.length,
      data: recommendations,
    });
  } catch (error) {
    next(error);
  }
}

export async function reviewReorderRecommendation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { status, adjustedQuantity, notes } = req.body;

    if (!status) {
      res.status(400).json({
        status: 'error',
        message: 'Review status ("pending", "reviewed", or "dismissed") is required.',
      });
      return;
    }

    const med = await pharmacyStore.getMedicineById(id);
    if (!med) {
      res.status(404).json({
        status: 'error',
        message: `Medicine with ID "${id}" not found.`,
      });
      return;
    }

    const updated = await forecastingService.reviewRecommendation(id, {
      status,
      adjustedQuantity: adjustedQuantity !== undefined ? Number(adjustedQuantity) : undefined,
      notes,
    });

    res.status(200).json({
      status: 'success',
      message: `Reorder recommendation for "${updated.medicineName}" marked as ${status}.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function getForecastSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const settings = await forecastingService.getSettings();
    res.status(200).json({
      status: 'success',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateForecastSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const updated = await forecastingService.updateSettings(req.body);
    res.status(200).json({
      status: 'success',
      message: 'Forecasting settings updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// SCIKIT-LEARN GRADIENT BOOSTING REGRESSOR ML FORECASTING & DATASET APIS
// ---------------------------------------------------------------------------

export async function getMlPredictions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const horizonParam = Number(req.query.horizon || req.query.period || 30);
    const horizon: 7 | 30 = horizonParam === 7 ? 7 : 30;

    const { mlForecastingService } = await import('../services/mlForecastingService.js');
    const results = await mlForecastingService.getMlPredictions(horizon);

    res.status(200).json({
      status: 'success',
      data: results,
    });
  } catch (error) {
    next(error);
  }
}

export async function getHistoricalDatasetInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { getSupabaseClient } = await import('../config/supabase.js');
    const client = getSupabaseClient();
    let dbCount = 0;
    if (client) {
      const { count } = await client
        .from('historical_sales')
        .select('id', { count: 'exact', head: true });
      dbCount = count || 0;
    }

    res.status(200).json({
      status: 'success',
      data: {
        label: 'Historical Synthetic Sales Data',
        sublabel: 'Synthetic Historical Data',
        tagline: '6 months | 30 medicines | 5,490 records',
        durationMonths: '6 months',
        totalMedicines: '30 medicines',
        totalRecords: '5,490 records',
        dateRange: 'April 5, 2026 to October 4, 2026',
        databaseTable: 'historical_sales',
        supabaseRecordCount: dbCount,
        isImportedToSupabase: dbCount >= 5490,
        modelUsed: 'Scikit-learn GradientBoostingRegressor',
        targetVariable: 'units_sold',
        featuresEngineered: [
          'lag_1',
          'lag_7',
          'lag_30',
          'sales_7d_avg',
          'sales_30d_avg',
          'month',
          'day_of_week',
          'is_weekend',
        ],
        chronologicalSplit: {
          training: '70%',
          validation: '15%',
          testing: '15%',
        },
        notice:
          'Clearly labeled as Historical Synthetic Sales Data for ML model training. Not current inventory.',
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function importHistoricalCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { importHistoricalSales } = await import('../scripts/importHistoricalSales.js');
    const result = await importHistoricalSales();
    res.status(200).json({
      status: result.success ? 'success' : 'error',
      data: result,
      message: result.success
        ? `Successfully imported ${result.recordsImported} historical sales records into Supabase table public.historical_sales!`
        : (result as any).needsMigration
        ? 'Table public.historical_sales does not exist in Supabase yet. Run supabase/migrations/20261005_historical_sales.sql in Supabase SQL editor.'
        : result.error || 'Failed to import historical data.',
    });
  } catch (error) {
    next(error);
  }
}

export async function retrainMlModel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { mlForecastingService } = await import('../services/mlForecastingService.js');
    await mlForecastingService.runPythonTraining();
    const results = await mlForecastingService.getMlPredictions(30);

    res.status(200).json({
      status: 'success',
      message: 'Scikit-learn GradientBoostingRegressor retrained and evaluated on historical dataset.',
      metrics: results.metrics,
    });
  } catch (error) {
    next(error);
  }
}

