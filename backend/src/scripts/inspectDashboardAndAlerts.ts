import { pharmacyStore } from '../services/pharmacyStore.js';
import { forecastingService } from '../services/forecastingService.js';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  console.log('--- Inspecting Database and API Objects ---');
  const medicines = await pharmacyStore.getAllMedicines();
  console.log(`Total medicines: ${medicines.length}`);

  const alerts = await pharmacyStore.getInventoryAlerts();
  console.log('Alerts Summary:', alerts.summary);
  console.log('Low Stock Medicines:', alerts.lowStockMedicines.map(m => `${m.name} (stock: ${m.usableStock}, min: ${m.minStockLevel})`));
  console.log('Out of Stock Medicines:', alerts.outOfStockMedicines.map(m => m.name));
  console.log('Near Expiry Batches:', alerts.nearExpiryBatches.map(b => `${b.medicineName} (${b.batchNumber}, days left: ${b.daysRemaining})`));
  console.log('Expired Batches:', alerts.expiredBatches.map(b => `${b.medicineName} (${b.batchNumber}, days ago: ${Math.abs(b.daysRemaining)})`));

  const suppliers = await pharmacyStore.getAllSuppliers();
  console.log(`Total Suppliers: ${suppliers.length}`);
  console.log('Sample Supplier:', suppliers[0]);

  const salesAnalytics = await pharmacyStore.getSalesAnalytics();
  console.log('Sales Analytics Summary:', salesAnalytics.summary);
  console.log(`Sales Trend Intervals: ${salesAnalytics.trend?.length}`);

  const forecast = await forecastingService.getForecastOverview(30);
  console.log('Forecast Overview:', {
    totalAnalyzed: forecast.totalAnalyzed,
    increasingDemandCount: forecast.increasingDemandCount,
    stableDemandCount: forecast.stableDemandCount,
    atRiskStockoutCount: forecast.atRiskStockoutCount,
    totalForecasted30DayDemand: forecast.totalForecasted30DayDemand,
  });

  const reorders = await forecastingService.getReorderRecommendations({ horizonDays: 30 });
  console.log(`Reorder Recommendations: ${reorders.length} items`);
  console.log('Top Reorders:', reorders.slice(0, 3).map(r => `${r.medicineName}: suggested ${r.suggestedReorderQuantity} ${r.unit} (urgency: ${r.urgency})`));

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
