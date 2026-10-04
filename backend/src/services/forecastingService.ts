import { pharmacyStore, MedicineWithBatches } from './pharmacyStore.js';
import { supabaseService } from './supabaseService.js';

export type ForecastHorizon = 7 | 30 | 90;
export type DemandTrend = 'increasing' | 'decreasing' | 'stable' | 'insufficient_data' | 'no_sales';
export type ReorderUrgency = 'critical' | 'high' | 'medium' | 'low';
export type ReviewStatus = 'pending' | 'reviewed' | 'dismissed';

export interface ForecastSettings {
  defaultHorizonDays: number; // 7 | 30 | 90
  safetyBufferDays: number; // e.g. 5 days of demand buffer
  minDataDaysRequired: number; // min distinct days with sales to establish trend (default 7)
  method: 'weighted_moving_average' | 'simple_moving_average' | 'trend_adjusted';
}

export interface MedicineForecastSummary {
  medicineId: string;
  medicineName: string;
  genericName?: string;
  category: string;
  unit: string;
  usableStock: number;
  expiredStock: number;
  minStockLevel: number;
  avgDailySales: number;
  predicted7DayDemand: number;
  predicted30DayDemand: number;
  predicted90DayDemand: number;
  predictedHorizonDemand: number; // demand for current selected horizon
  demandTrend: DemandTrend;
  trendGrowthPct: number;
  stockDepletionDays: number | null; // null if 0 sales
  urgency: ReorderUrgency;
  suggestedAction: string;
  confidence: 'high' | 'moderate' | 'low' | 'none';
  historicalDataDays: number;
  totalHistoricalUnitsSold: number;
}

export interface MedicineForecastDetail {
  summary: MedicineForecastSummary;
  medicine: MedicineWithBatches;
  historicalSalesTimeline: {
    date: string;
    label: string;
    quantity: number;
  }[];
  projectedDemandTimeline: {
    date: string;
    label: string;
    forecastedDaily: number;
    cumulativeForecast: number;
    remainingStockProjected: number;
  }[];
  calculationDetails: {
    method: string;
    recent7DayAvg: number;
    previous14DayAvg: number;
    fullPeriodAvg: number;
    weightsApplied: { recent7d: number; prev14d: number; baseline: number };
    growthRatePct: number;
    safetyBufferApplied: number;
    explanation: string;
  };
  batchesBreakdown: {
    batchId: string;
    batchNumber: string;
    quantity: number;
    expiryDate: string;
    daysRemaining: number;
    isUsable: boolean;
    expiresWithinHorizon: boolean;
  }[];
}

export interface ReorderRecommendation {
  id: string; // reorder-${medicineId}
  medicineId: string;
  medicineName: string;
  category: string;
  unit: string;
  currentUsableStock: number;
  minStockLevel: number;
  avgDailyDemand: number;
  planningHorizonDays: number;
  forecastedDemand: number;
  safetyBuffer: number;
  suggestedReorderQuantity: number;
  urgency: ReorderUrgency;
  reason: string;
  stockDepletionDays: number | null;
  sellingPrice: number;
  purchasePrice?: number;
  estimatedCost?: number;
  reviewStatus: ReviewStatus;
  adjustedQuantity?: number;
  reviewerNotes?: string;
  reviewedAt?: string;
}

export interface ForecastOverview {
  totalAnalyzed: number;
  increasingDemandCount: number;
  decreasingDemandCount: number;
  stableDemandCount: number;
  insufficientDataCount: number;
  noSalesCount: number;
  atRiskStockoutCount: number; // critical or high urgency
  totalForecasted30DayDemand: number;
  totalSuggestedReorderUnits: number;
  pendingReviewsCount: number;
  settings: ForecastSettings;
}

interface ReviewRecord {
  status: ReviewStatus;
  adjustedQuantity?: number;
  notes?: string;
  reviewedAt?: string;
}

class ForecastingService {
  private inMemorySettings: ForecastSettings = {
    defaultHorizonDays: 30,
    safetyBufferDays: 5,
    minDataDaysRequired: 7,
    method: 'weighted_moving_average',
  };

  // Reorder reviews store (persisted in-memory when not using PostgreSQL)
  private inMemoryReviews: Map<string, ReviewRecord> = new Map();

  public async getSettings(): Promise<ForecastSettings> {
    if (await pharmacyStore.isUsingSupabase()) {
      return supabaseService.getForecastSettings();
    }
    return { ...this.inMemorySettings };
  }

  public async updateSettings(updates: Partial<ForecastSettings>): Promise<ForecastSettings> {
    if (updates.defaultHorizonDays !== undefined) {
      if (![7, 30, 90].includes(Number(updates.defaultHorizonDays))) {
        throw new Error('Default horizon must be 7, 30, or 90 days.');
      }
    }

    if (updates.safetyBufferDays !== undefined) {
      const days = Number(updates.safetyBufferDays);
      if (days < 0 || days > 30) {
        throw new Error('Safety buffer days must be between 0 and 30.');
      }
    }

    if (updates.minDataDaysRequired !== undefined) {
      const minDays = Number(updates.minDataDaysRequired);
      if (minDays < 1 || minDays > 30) {
        throw new Error('Minimum historical data days must be between 1 and 30.');
      }
    }

    if (updates.method !== undefined) {
      if (
        !['weighted_moving_average', 'simple_moving_average', 'trend_adjusted'].includes(
          updates.method
        )
      ) {
        throw new Error('Invalid forecasting method.');
      }
    }

    if (await pharmacyStore.isUsingSupabase()) {
      return supabaseService.updateForecastSettings(updates);
    }

    if (updates.defaultHorizonDays !== undefined) {
      this.inMemorySettings.defaultHorizonDays = Number(updates.defaultHorizonDays);
    }
    if (updates.safetyBufferDays !== undefined) {
      this.inMemorySettings.safetyBufferDays = Number(updates.safetyBufferDays);
    }
    if (updates.minDataDaysRequired !== undefined) {
      this.inMemorySettings.minDataDaysRequired = Number(updates.minDataDaysRequired);
    }
    if (updates.method !== undefined) {
      this.inMemorySettings.method = updates.method;
    }

    return { ...this.inMemorySettings };
  }

  /**
   * Aggregates daily sales quantity for a specific medicine over the past N calendar days.
   */
  public async getDailySalesForMedicine(medicineId: string, daysBack = 30): Promise<Map<string, number>> {
    const sales = await pharmacyStore.getAllSales();
    return this.calculateDailySalesFromList(sales, medicineId, daysBack);
  }

  /**
   * Synchronously builds daily sales map from a pre-fetched sales array.
   */
  public calculateDailySalesFromList(sales: any[], medicineId: string, daysBack = 30): Map<string, number> {
    const map = new Map<string, number>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Initialize all days in window with 0
    for (let i = daysBack - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      map.set(key, 0);
    }

    // Accumulate actual sales
    for (const sale of sales) {
      const saleDate = sale.createdAt ? sale.createdAt.split('T')[0] : '';
      if (saleDate && map.has(saleDate)) {
        if (sale.items && sale.items.length > 0) {
          for (const item of sale.items) {
            if (item.medicineId === medicineId) {
              const current = map.get(saleDate) || 0;
              map.set(saleDate, current + Number(item.quantity));
            }
          }
        } else if (sale.medicineId === medicineId) {
          const current = map.get(saleDate) || 0;
          map.set(saleDate, current + (Number(sale.quantity) || 0));
        }
      }
    }

    return map;
  }

  /**
   * Computes demand forecast for a single medicine.
   */
  public async calculateMedicineForecast(
    medicineId: string,
    horizonDays?: number,
    existingMed?: MedicineWithBatches,
    preloadedSales?: any[]
  ): Promise<MedicineForecastSummary> {
    const settings = await this.getSettings();
    const selectedHorizon = horizonDays || settings.defaultHorizonDays;
    const med = existingMed || (await pharmacyStore.getMedicineById(medicineId));
    if (!med) {
      throw new Error(`Medicine with ID "${medicineId}" not found.`);
    }

    const dailySalesMap = preloadedSales
      ? this.calculateDailySalesFromList(preloadedSales, medicineId, 30)
      : await this.getDailySalesForMedicine(medicineId, 30);
    const dailyValues = Array.from(dailySalesMap.values());

    const totalSold = dailyValues.reduce((sum, v) => sum + v, 0);
    const daysWithSales = dailyValues.filter((v) => v > 0).length;

    // Case 1: No Sales History
    if (totalSold === 0 || daysWithSales === 0) {
      return {
        medicineId: med.id,
        medicineName: med.name,
        genericName: med.genericName,
        category: med.category,
        unit: med.unit,
        usableStock: med.usableStock,
        expiredStock: med.expiredStock,
        minStockLevel: med.minStockLevel,
        avgDailySales: 0,
        predicted7DayDemand: 0,
        predicted30DayDemand: 0,
        predicted90DayDemand: 0,
        predictedHorizonDemand: 0,
        demandTrend: 'no_sales',
        trendGrowthPct: 0,
        stockDepletionDays: null,
        urgency: med.usableStock === 0 ? 'critical' : med.usableStock <= med.minStockLevel ? 'high' : 'low',
        suggestedAction:
          med.usableStock === 0
            ? 'Stock out! No sales record found, review minimum stock baseline to reorder.'
            : 'No sales recorded in the past 30 days. Maintain buffer stock.',
        confidence: 'none',
        historicalDataDays: 0,
        totalHistoricalUnitsSold: 0,
      };
    }

    // Split 30 days:
    // Recent 7 days: indices 23..29 (last 7 elements)
    // Previous 14 days: indices 9..22 (14 elements)
    // Baseline 9 days: indices 0..8 (9 elements)
    const recent7Days = dailyValues.slice(23);
    const prev14Days = dailyValues.slice(9, 23);
    const baseline9Days = dailyValues.slice(0, 9);

    const avgRecent7 = recent7Days.reduce((sum, v) => sum + v, 0) / 7;
    const avgPrev14 = prev14Days.reduce((sum, v) => sum + v, 0) / 14;
    const avgBaseline9 = baseline9Days.reduce((sum, v) => sum + v, 0) / 9;
    const avg30Days = totalSold / 30;

    let growthRatePct = 0;
    if (avgPrev14 > 0) {
      growthRatePct = ((avgRecent7 - avgPrev14) / avgPrev14) * 100;
    } else if (avgRecent7 > 0) {
      growthRatePct = 100;
    }

    // Demand trend classification
    let demandTrend: DemandTrend = 'stable';
    if (daysWithSales < settings.minDataDaysRequired) {
      demandTrend = 'insufficient_data';
    } else if (growthRatePct >= 15) {
      demandTrend = 'increasing';
    } else if (growthRatePct <= -15) {
      demandTrend = 'decreasing';
    } else {
      demandTrend = 'stable';
    }

    // Weighted average daily sales forecast
    let forecastedDailyDemand: number;
    if (settings.method === 'weighted_moving_average') {
      forecastedDailyDemand = 0.5 * avgRecent7 + 0.3 * avgPrev14 + 0.2 * avgBaseline9;
    } else if (settings.method === 'trend_adjusted') {
      const trendMultiplier = 1 + Math.max(-0.5, Math.min(0.5, growthRatePct / 100)) * 0.5;
      forecastedDailyDemand = avgRecent7 * trendMultiplier;
    } else {
      forecastedDailyDemand = avg30Days;
    }

    forecastedDailyDemand = Math.max(0.01, forecastedDailyDemand);

    const predicted7DayDemand = Math.ceil(forecastedDailyDemand * 7);
    const predicted30DayDemand = Math.ceil(forecastedDailyDemand * 30);
    const predicted90DayDemand = Math.ceil(forecastedDailyDemand * 90);
    const predictedHorizonDemand = Math.ceil(forecastedDailyDemand * selectedHorizon);

    // Stock depletion in days
    const stockDepletionDays =
      forecastedDailyDemand > 0 ? Math.floor(med.usableStock / forecastedDailyDemand) : null;

    // Urgency classification
    let urgency: ReorderUrgency = 'low';
    if (med.usableStock === 0) {
      urgency = 'critical';
    } else if (stockDepletionDays !== null && stockDepletionDays <= 7) {
      urgency = 'critical';
    } else if (
      (stockDepletionDays !== null && stockDepletionDays <= 14) ||
      med.usableStock <= med.minStockLevel
    ) {
      urgency = 'high';
    } else if (stockDepletionDays !== null && stockDepletionDays <= 30) {
      urgency = 'medium';
    } else {
      urgency = 'low';
    }

    // Confidence score
    let confidence: 'high' | 'moderate' | 'low' | 'none' = 'low';
    if (daysWithSales >= 20) confidence = 'high';
    else if (daysWithSales >= 10) confidence = 'moderate';
    else if (daysWithSales >= 1) confidence = 'low';
    else confidence = 'none';

    let suggestedAction = '';
    if (urgency === 'critical') {
      suggestedAction = `Stockout imminent in ~${stockDepletionDays ?? 0} days! Place purchase order immediately.`;
    } else if (urgency === 'high') {
      suggestedAction = `Stock covers ~${stockDepletionDays} days. Recommend reordering within this week.`;
    } else if (urgency === 'medium') {
      suggestedAction = `Adequate stock for ~${stockDepletionDays} days. Add to standard replenishment cycle.`;
    } else {
      suggestedAction = `Healthy inventory level (~${stockDepletionDays} days coverage). No immediate action required.`;
    }

    return {
      medicineId: med.id,
      medicineName: med.name,
      genericName: med.genericName,
      category: med.category,
      unit: med.unit,
      usableStock: med.usableStock,
      expiredStock: med.expiredStock,
      minStockLevel: med.minStockLevel,
      avgDailySales: Math.round(forecastedDailyDemand * 100) / 100,
      predicted7DayDemand,
      predicted30DayDemand,
      predicted90DayDemand,
      predictedHorizonDemand,
      demandTrend,
      trendGrowthPct: Math.round(growthRatePct * 10) / 10,
      stockDepletionDays,
      urgency,
      suggestedAction,
      confidence,
      historicalDataDays: daysWithSales,
      totalHistoricalUnitsSold: totalSold,
    };
  }

  /**
   * Retrieves full analytical forecast detail for a single medicine.
   */
  public async getMedicineForecastDetail(
    medicineId: string,
    horizonDays?: number
  ): Promise<MedicineForecastDetail> {
    const summary = await this.calculateMedicineForecast(medicineId, horizonDays);
    const med = await pharmacyStore.getMedicineById(medicineId);
    if (!med) throw new Error('Medicine not found.');

    const settings = await this.getSettings();
    const horizon = horizonDays || settings.defaultHorizonDays;
    const dailySalesMap = await this.getDailySalesForMedicine(medicineId, 30);

    const historicalSalesTimeline: { date: string; label: string; quantity: number }[] = [];
    for (const [dateStr, quantity] of dailySalesMap.entries()) {
      const d = new Date(dateStr);
      historicalSalesTimeline.push({
        date: dateStr,
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        quantity,
      });
    }

    const projectedDemandTimeline: {
      date: string;
      label: string;
      forecastedDaily: number;
      cumulativeForecast: number;
      remainingStockProjected: number;
    }[] = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let cumulative = 0;
    let currentStock = med.usableStock;

    for (let day = 1; day <= horizon; day++) {
      const projDate = new Date(today);
      projDate.setDate(projDate.getDate() + day);
      const dateKey = projDate.toISOString().split('T')[0];

      cumulative += summary.avgDailySales;
      currentStock = Math.max(0, currentStock - summary.avgDailySales);

      projectedDemandTimeline.push({
        date: dateKey,
        label: projDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        forecastedDaily: Math.round(summary.avgDailySales * 10) / 10,
        cumulativeForecast: Math.round(cumulative),
        remainingStockProjected: Math.round(currentStock),
      });
    }

    const horizonEndDate = new Date(today);
    horizonEndDate.setDate(horizonEndDate.getDate() + horizon);

    const batchesBreakdown = med.batches.map((b) => {
      const exp = new Date(b.expiryDate);
      exp.setHours(0, 0, 0, 0);
      const diffMs = exp.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 3600 * 24));
      const isUsable = daysRemaining >= 0 && b.quantity > 0;
      const expiresWithinHorizon = isUsable && exp <= horizonEndDate;

      return {
        batchId: b.id,
        batchNumber: b.batchNumber,
        quantity: b.quantity,
        expiryDate: b.expiryDate,
        daysRemaining,
        isUsable,
        expiresWithinHorizon,
      };
    });

    const dailyValues = Array.from(dailySalesMap.values());
    const recent7 = dailyValues.slice(23).reduce((sum, v) => sum + v, 0) / 7;
    const prev14 = dailyValues.slice(9, 23).reduce((sum, v) => sum + v, 0) / 14;
    const full30 = dailyValues.reduce((sum, v) => sum + v, 0) / 30;

    return {
      summary,
      medicine: med,
      historicalSalesTimeline,
      projectedDemandTimeline,
      calculationDetails: {
        method: settings.method,
        recent7DayAvg: Math.round(recent7 * 100) / 100,
        previous14DayAvg: Math.round(prev14 * 100) / 100,
        fullPeriodAvg: Math.round(full30 * 100) / 100,
        weightsApplied: { recent7d: 0.5, prev14d: 0.3, baseline: 0.2 },
        growthRatePct: summary.trendGrowthPct,
        safetyBufferApplied: settings.safetyBufferDays,
        explanation:
          'Forecast uses a 30-day weighted moving average model (50% recent 7 days, 30% previous 14 days, 20% baseline) combined with expiration-aware batch tracking.',
      },
      batchesBreakdown,
    };
  }

  /**
   * Generates a high-level overview of demand forecasting across all medicines.
   */
  public async getForecastOverview(horizonDays?: number): Promise<ForecastOverview> {
    const settings = await this.getSettings();
    const horizon = horizonDays || settings.defaultHorizonDays;
    const medicines = await pharmacyStore.getAllMedicines();
    const allSales = await pharmacyStore.getAllSales();

    let increasingDemandCount = 0;
    let decreasingDemandCount = 0;
    let stableDemandCount = 0;
    let insufficientDataCount = 0;
    let noSalesCount = 0;
    let atRiskStockoutCount = 0;
    let totalForecasted30DayDemand = 0;

    for (const med of medicines) {
      try {
        const f = await this.calculateMedicineForecast(med.id, horizon, med, allSales);
        totalForecasted30DayDemand += f.predicted30DayDemand;

        if (f.demandTrend === 'increasing') increasingDemandCount++;
        else if (f.demandTrend === 'decreasing') decreasingDemandCount++;
        else if (f.demandTrend === 'stable') stableDemandCount++;
        else if (f.demandTrend === 'insufficient_data') insufficientDataCount++;
        else if (f.demandTrend === 'no_sales') noSalesCount++;

        if (f.urgency === 'critical' || f.urgency === 'high') {
          atRiskStockoutCount++;
        }
      } catch (err) {
        console.warn(`[Forecasting] Skipped medicine ${med.id}:`, err);
      }
    }

    const reorders = await this.getReorderRecommendations({ horizonDays: horizon }, medicines, allSales);
    const totalSuggestedReorderUnits = reorders.reduce((sum, r) => sum + r.suggestedReorderQuantity, 0);
    const pendingReviewsCount = reorders.filter((r) => r.reviewStatus === 'pending').length;

    return {
      totalAnalyzed: medicines.length,
      increasingDemandCount,
      decreasingDemandCount,
      stableDemandCount,
      insufficientDataCount,
      noSalesCount,
      atRiskStockoutCount,
      totalForecasted30DayDemand,
      totalSuggestedReorderUnits,
      pendingReviewsCount,
      settings,
    };
  }

  /**
   * Generates smart reorder recommendations for all medicines.
   */
  public async getReorderRecommendations(
    filters?: {
      urgency?: ReorderUrgency | 'all';
      category?: string;
      stockStatus?: string;
      reviewStatus?: ReviewStatus | 'all';
      horizonDays?: number;
    },
    preloadedMedicines?: MedicineWithBatches[],
    preloadedSales?: any[]
  ): Promise<ReorderRecommendation[]> {
    const settings = await this.getSettings();
    const medicines = preloadedMedicines || (await pharmacyStore.getAllMedicines());
    const sales = preloadedSales || (await pharmacyStore.getAllSales());
    const horizon = filters?.horizonDays || settings.defaultHorizonDays;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizonEndDate = new Date(today);
    horizonEndDate.setDate(horizonEndDate.getDate() + horizon);

    // Fetch review records from Supabase or in-memory
    let reviewsMap: Map<string, any>;
    if (await pharmacyStore.isUsingSupabase()) {
      reviewsMap = await supabaseService.getReorderReviews();
    } else {
      reviewsMap = this.inMemoryReviews;
    }

    const list: ReorderRecommendation[] = [];

    for (const med of medicines) {
      let forecast: MedicineForecastSummary;
      try {
        forecast = await this.calculateMedicineForecast(med.id, horizon, med, sales);
      } catch {
        continue;
      }

      // Usable stock that will NOT expire within planning horizon
      let effectiveStockForHorizon = 0;
      for (const b of med.batches) {
        const exp = new Date(b.expiryDate);
        exp.setHours(0, 0, 0, 0);
        if (exp >= today && exp > horizonEndDate) {
          effectiveStockForHorizon += b.quantity;
        }
      }

      const projectedDemand = forecast.predictedHorizonDemand;
      const safetyBufferUnits = Math.ceil(forecast.avgDailySales * settings.safetyBufferDays);
      const targetRequiredStock = projectedDemand + safetyBufferUnits;

      let suggestedReorderQuantity = 0;
      if (effectiveStockForHorizon < targetRequiredStock) {
        suggestedReorderQuantity = targetRequiredStock - effectiveStockForHorizon;
      }

      if (med.usableStock <= med.minStockLevel && suggestedReorderQuantity === 0) {
        suggestedReorderQuantity = med.minStockLevel * 2 - med.usableStock;
      }

      let reason = '';
      if (med.usableStock === 0) {
        reason = 'Zero stock remaining. Immediate replenishment needed.';
      } else if (forecast.urgency === 'critical') {
        reason = `Projected depletion in ${forecast.stockDepletionDays ?? 0} days. Critical reorder.`;
      } else if (med.usableStock <= med.minStockLevel) {
        reason = `Usable stock (${med.usableStock}) is below minimum alert threshold (${med.minStockLevel}).`;
      } else if (suggestedReorderQuantity > 0) {
        reason = `Stock will not satisfy projected ${horizon}-day demand + ${settings.safetyBufferDays}-day safety buffer.`;
      } else {
        reason = 'Inventory level is adequate for the planning horizon.';
      }

      const review = reviewsMap.get(med.id);
      const reviewStatus: ReviewStatus = review?.status || 'pending';
      const adjustedQuantity = review?.adjustedQuantity;
      const reviewerNotes = review?.reviewerNotes || review?.notes;
      const reviewedAt = review?.reviewedAt;

      const estimatedPrice = med.purchasePrice || med.sellingPrice * 0.7;
      const orderQty = adjustedQuantity !== undefined ? adjustedQuantity : suggestedReorderQuantity;
      const estimatedCost = Math.round(orderQty * estimatedPrice * 100) / 100;

      list.push({
        id: `reorder-${med.id}`,
        medicineId: med.id,
        medicineName: med.name,
        category: med.category,
        unit: med.unit,
        currentUsableStock: med.usableStock,
        minStockLevel: med.minStockLevel,
        avgDailyDemand: forecast.avgDailySales,
        planningHorizonDays: horizon,
        forecastedDemand: projectedDemand,
        safetyBuffer: safetyBufferUnits,
        suggestedReorderQuantity: Math.max(0, suggestedReorderQuantity),
        urgency: forecast.urgency,
        reason,
        stockDepletionDays: forecast.stockDepletionDays,
        sellingPrice: med.sellingPrice,
        purchasePrice: med.purchasePrice,
        estimatedCost,
        reviewStatus,
        adjustedQuantity,
        reviewerNotes,
        reviewedAt,
      });
    }

    let filtered = list;
    if (filters?.urgency && filters.urgency !== 'all') {
      filtered = filtered.filter((r) => r.urgency === filters.urgency);
    }
    if (filters?.category) {
      filtered = filtered.filter((r) => r.category.toLowerCase() === filters.category!.toLowerCase());
    }
    if (filters?.stockStatus) {
      filtered = filtered.filter((r) => {
        const med = medicines.find((m) => m.id === r.medicineId);
        return med && med.stockStatus.toLowerCase() === filters.stockStatus!.toLowerCase();
      });
    }
    if (filters?.reviewStatus && filters.reviewStatus !== 'all') {
      filtered = filtered.filter((r) => r.reviewStatus === filters.reviewStatus);
    }

    const urgencyRank: Record<ReorderUrgency, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    filtered.sort((a, b) => {
      const uDiff = urgencyRank[a.urgency] - urgencyRank[b.urgency];
      if (uDiff !== 0) return uDiff;
      return b.suggestedReorderQuantity - a.suggestedReorderQuantity;
    });

    return filtered;
  }

  /**
   * Updates the pharmacist's review status on a reorder recommendation.
   */
  public async reviewRecommendation(
    medicineId: string,
    data: {
      status: ReviewStatus;
      adjustedQuantity?: number;
      notes?: string;
    }
  ): Promise<ReorderRecommendation> {
    const med = await pharmacyStore.getMedicineById(medicineId);
    if (!med) throw new Error(`Medicine with ID "${medicineId}" not found.`);

    if (!['pending', 'reviewed', 'dismissed'].includes(data.status)) {
      throw new Error('Status must be "pending", "reviewed", or "dismissed".');
    }

    if (data.adjustedQuantity !== undefined && Number(data.adjustedQuantity) < 0) {
      throw new Error('Adjusted reorder quantity must be non-negative.');
    }

    const now = new Date().toISOString();
    const reviewRecord: ReviewRecord = {
      status: data.status,
      adjustedQuantity: data.adjustedQuantity !== undefined ? Number(data.adjustedQuantity) : undefined,
      notes: data.notes ? data.notes.trim() : undefined,
      reviewedAt: now,
    };

    if (await pharmacyStore.isUsingSupabase()) {
      await supabaseService.saveReorderReview(medicineId, {
        status: data.status,
        suggestedQuantity: 0,
        adjustedQuantity: reviewRecord.adjustedQuantity,
        reviewerNotes: reviewRecord.notes,
      });
    } else {
      this.inMemoryReviews.set(medicineId, reviewRecord);
    }

    const reorders = await this.getReorderRecommendations();
    const updated = reorders.find((r) => r.medicineId === medicineId);
    if (!updated) throw new Error('Failed to retrieve updated recommendation.');

    return updated;
  }
}

export const forecastingService = new ForecastingService();
