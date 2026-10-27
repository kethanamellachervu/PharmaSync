import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { pharmacyStore, MedicineWithBatches } from './pharmacyStore.js';
import { getSupabaseClient } from '../config/supabase.js';

export interface MlModelMetrics {
  mae: number;
  rmse: number;
  mape_percent: number;
}

export interface MlDatasetInfo {
  name: string;
  total_raw_records: number;
  training_records: number;
  validation_records: number;
  testing_records: number;
  total_medicines: number;
  source: string;
}

export interface MlMedicinePrediction {
  medicineId: string;
  medicineName: string;
  genericName?: string;
  category: string;
  unit: string;
  csvMedicineId: string;
  csvMedicineName: string;
  currentStock: number;
  minStockLevel: number;
  safetyStock: number;
  dailyAverageSales: number;
  forecast7d: number;
  forecast30d: number;
  selectedHorizon: 7 | 30;
  predictedHorizonDemand: number;
  demandTrend: 'Increasing' | 'Decreasing' | 'Stable';
  stockStatus: 'Good' | 'May Run Out Soon' | 'Low Stock';
  whatToDo: 'No action needed' | 'Plan Purchase';
  reorderRecommendation: 'REORDER NOW' | 'STOCK SUFFICIENT';
  recommendedQuantity: number;
  recentHistory: {
    date: string;
    units_sold: number;
    sales_7d_avg: number;
  }[];
  dailyForecasts: {
    day: number;
    date: string;
    predicted_units: number;
  }[];
}

export interface MlForecastingFullResult {
  predictions: MlMedicinePrediction[];
  summary: {
    totalMedicinesAnalyzed: number;
    reorderNowCount: number;
    stockSufficientCount: number;
    total7dForecastUnits: number;
    total30dForecastUnits: number;
    totalRecommendedOrderUnits: number;
  };
}

class MlForecastingService {
  private resultsCache: any = null;
  private lastLoadedTime = 0;

  private getResultsFilePath(): string {
    const candidatePaths = [
      path.resolve('ml/forecast_results.json'),
      path.resolve('src/../ml/forecast_results.json'),
      path.resolve(process.cwd(), 'ml/forecast_results.json'),
      path.resolve(process.cwd(), 'backend/ml/forecast_results.json'),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) return p;
    }
    return candidatePaths[0];
  }

  public async getRawMlResults(): Promise<any> {
    const filePath = this.getResultsFilePath();

    if (this.resultsCache && Date.now() - this.lastLoadedTime < 60000) {
      return this.resultsCache;
    }

    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        this.resultsCache = JSON.parse(raw);
        this.lastLoadedTime = Date.now();
        return this.resultsCache;
      } catch (err) {
        console.error('[MlForecastingService] Failed to parse forecast_results.json:', err);
      }
    }

    // Trigger python training script if results file not found
    await this.runPythonTraining();

    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      this.resultsCache = JSON.parse(raw);
      this.lastLoadedTime = Date.now();
      return this.resultsCache;
    }

    throw new Error('Forecast model results could not be loaded or generated.');
  }

  public async runPythonTraining(): Promise<void> {
    return new Promise((resolve, reject) => {
      const pyScript = path.resolve(
        fs.existsSync('ml/train_forecasting_model.py')
          ? 'ml/train_forecasting_model.py'
          : 'backend/ml/train_forecasting_model.py'
      );

      const pyProcess = spawn('python', [pyScript], {
        cwd: path.dirname(pyScript) + '/..',
      });

      let stdout = '';
      let stderr = '';

      pyProcess.stdout.on('data', (d) => {
        stdout += d.toString();
      });
      pyProcess.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      pyProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Python model training failed: ${stderr || stdout}`));
        }
      });
    });
  }

  private norm(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private matchDbMedicineWithMl(
    dbMed: MedicineWithBatches,
    mlMedicines: Record<string, any>
  ): { key: string; med: any } | null {
    const dbCleanName = this.norm(dbMed.name);
    const dbCleanGeneric = dbMed.genericName ? this.norm(dbMed.genericName) : '';

    // Direct exact or substring match
    for (const [key, mlMed] of Object.entries(mlMedicines)) {
      const mlClean = this.norm(mlMed.medicine_name);
      if (
        dbCleanName.includes(mlClean) ||
        mlClean.includes(dbCleanName) ||
        (dbCleanGeneric && dbCleanGeneric.includes(mlClean)) ||
        (dbCleanGeneric && mlClean.includes(dbCleanGeneric))
      ) {
        return { key, med: mlMed };
      }
    }

    return null;
  }

  public async getMlPredictions(horizon: 7 | 30 = 30): Promise<MlForecastingFullResult> {
    const mlData = await this.getRawMlResults();
    const medicines = await pharmacyStore.getAllMedicines();
    const mlMedicines = mlData.medicines as Record<string, any>;

    const predictions: MlMedicinePrediction[] = [];
    const usedMlKeys = new Set<string>();

    for (const med of medicines) {
      const match = this.matchDbMedicineWithMl(med, mlMedicines);
      let mlEntry: any = null;
      let csvId = 'MED001';

      if (match) {
        mlEntry = match.med;
        csvId = match.key;
        usedMlKeys.add(match.key);
      } else {
        mlEntry = mlMedicines['MED001'] || Object.values(mlMedicines)[0];
      }

      const currentStock = med.usableStock;
      const forecast7d = mlEntry.forecast_7d || 0;
      const forecast30d = mlEntry.forecast_30d || 0;
      const predictedDemand = horizon === 7 ? forecast7d : forecast30d;
      const safetyStock = mlEntry.safety_stock || Math.ceil(med.minStockLevel * 0.5);

      // Trend Calculation
      const daily7Avg = forecast7d / 7;
      const daily30Avg = mlEntry.daily_average_sales || (forecast30d / 30);
      let demandTrend: 'Increasing' | 'Decreasing' | 'Stable' = 'Stable';
      if (daily7Avg > daily30Avg * 1.05) demandTrend = 'Increasing';
      else if (daily7Avg < daily30Avg * 0.95) demandTrend = 'Decreasing';

      // Stock Status Calculation
      let stockStatus: 'Good' | 'May Run Out Soon' | 'Low Stock' = 'Good';
      if (currentStock < forecast7d || currentStock <= med.minStockLevel) {
        stockStatus = 'Low Stock';
      } else if (currentStock < forecast30d) {
        stockStatus = 'May Run Out Soon';
      }

      // Action Calculation
      const whatToDo: 'No action needed' | 'Plan Purchase' =
        stockStatus === 'Good' ? 'No action needed' : 'Plan Purchase';

      const isReorder = stockStatus !== 'Good';
      const netShortage = predictedDemand + safetyStock - currentStock;
      const recommendedQuantity = Math.max(0, Math.round(netShortage));

      predictions.push({
        medicineId: med.id,
        medicineName: med.name.replace(/\(Historical Dataset\)/g, '').trim(),
        genericName: med.genericName,
        category: med.category || 'General',
        unit: med.unit || 'units',
        csvMedicineId: csvId,
        csvMedicineName: mlEntry.medicine_name,
        currentStock,
        minStockLevel: med.minStockLevel,
        safetyStock,
        dailyAverageSales: Number((daily30Avg).toFixed(1)),
        forecast7d,
        forecast30d,
        selectedHorizon: horizon,
        predictedHorizonDemand: predictedDemand,
        demandTrend,
        stockStatus,
        whatToDo,
        reorderRecommendation: isReorder ? 'REORDER NOW' : 'STOCK SUFFICIENT',
        recommendedQuantity,
        recentHistory: mlEntry.recent_history || [],
        dailyForecasts: (mlEntry.daily_forecasts_30d || []).slice(0, horizon),
      });
    }

    const reorderNowCount = predictions.filter((p) => p.whatToDo === 'Plan Purchase').length;
    const stockSufficientCount = predictions.filter((p) => p.whatToDo === 'No action needed').length;
    const total7dForecastUnits = predictions.reduce((s, p) => s + p.forecast7d, 0);
    const total30dForecastUnits = predictions.reduce((s, p) => s + p.forecast30d, 0);
    const totalRecommendedOrderUnits = predictions.reduce((s, p) => s + p.recommendedQuantity, 0);

    return {
      predictions,
      summary: {
        totalMedicinesAnalyzed: predictions.length,
        reorderNowCount,
        stockSufficientCount,
        total7dForecastUnits,
        total30dForecastUnits,
        totalRecommendedOrderUnits,
      },
    };
  }
}

export const mlForecastingService = new MlForecastingService();
