import http from 'http';
import app from '../app.js';

async function runVerification() {
  console.log('==================================================');
  console.log('🧪 PharmaSync End-to-End API Verification');
  console.log('==================================================');

  // Start test server on ephemeral port
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://localhost:${address.port}/api`;
  console.log(`📡 Test server running at ${baseUrl}`);

  let passedTests = 0;
  let failedTests = 0;

  async function testEndpoint(
    name: string,
    url: string,
    options?: RequestInit,
    expectedStatus = 200,
    checkFn?: (data: any) => boolean
  ): Promise<any> {
    try {
      const res = await fetch(`${baseUrl}${url}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });

      if (res.status !== expectedStatus) {
        console.error(`❌ [${name}] Expected status ${expectedStatus}, received ${res.status}`);
        failedTests++;
        return null;
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await res.json();
        if (checkFn && !checkFn(json)) {
          console.error(`❌ [${name}] Custom assertion check failed on response payload:`, json);
          failedTests++;
          return null;
        }
        console.log(`✅ [${name}] PASSED (${res.status})`);
        passedTests++;
        return json;
      } else {
        const text = await res.text();
        console.log(`✅ [${name}] PASSED (${res.status} non-json payload: ${text.length} bytes)`);
        passedTests++;
        return text;
      }
    } catch (err: any) {
      console.error(`❌ [${name}] Request error:`, err.message);
      failedTests++;
      return null;
    }
  }

  // 1. Health check & Supabase database status
  await testEndpoint('Health Check', '/health', {}, 200, (d) => {
    return d.status === 'success' && d.database && (d.database.type === 'Supabase (PostgreSQL)' || d.database.type.includes('Supabase'));
  });

  await testEndpoint('Database Status', '/inventory/database-status', {}, 200, (d) => {
    return d.status === 'success' && typeof d.data.isConnected === 'boolean';
  });

  // 2. Inventory CRUD & Dashboard
  const invRes = await testEndpoint('Get Inventory List', '/inventory', {}, 200, (d) => {
    return d.status === 'success' && Array.isArray(d.data) && d.data.length > 0;
  });

  const firstMed = invRes?.data?.[0];
  if (firstMed) {
    await testEndpoint(`Get Medicine by ID (${firstMed.name})`, `/inventory/${firstMed.id}`, {}, 200, (d) => {
      return d.status === 'success' && d.data.id === firstMed.id;
    });

    await testEndpoint('Get Batches for Medicine', `/inventory/${firstMed.id}/batches`, {}, 200, (d) => {
      return d.status === 'success' && Array.isArray(d.data);
    });
  }

  await testEndpoint('Get Dashboard Overview', '/inventory/dashboard', {}, 200, (d) => {
    return d.status === 'success' && d.data.totalMedicines > 0;
  });

  await testEndpoint('Get Inventory Alerts', '/inventory/alerts', {}, 200, (d) => {
    return d.status === 'success' && d.data.summary !== undefined;
  });

  await testEndpoint('Get Stock Movement History', '/inventory/movements', {}, 200, (d) => {
    return d.status === 'success' && Array.isArray(d.data);
  });

  // 3. FEFO Allocation Simulation
  if (firstMed) {
    await testEndpoint(
      'FEFO Stock Allocation',
      '/inventory/fefo-allocate',
      {
        method: 'POST',
        body: JSON.stringify({
          medicineId: firstMed.id,
          quantity: 2,
          reason: 'Verification test allocation',
        }),
      },
      200,
      (d) => d.status === 'success' && d.data.success === true
    );
  }

  // 4. Add Medicine
  const tempMedName = `Temporary Verification Med ${Date.now().toString().slice(-4)}`;
  const newMedRes = await testEndpoint(
    'Add New Medicine with Initial Batch',
    '/inventory',
    {
      method: 'POST',
      body: JSON.stringify({
        name: tempMedName,
        genericName: 'Temporary',
        category: 'Analgesics',
        manufacturer: 'Apex Pharma',
        unit: 'tablets',
        minStockLevel: 20,
        sellingPrice: 25.0,
        purchasePrice: 15.0,
        batchNumber: `TEST-IBU-${Date.now().toString().slice(-4)}`,
        quantity: 50,
        expiryDate: '2028-12-31',
      }),
    },
    201,
    (d) => d.status === 'success' && d.data.id !== undefined
  );

  // 5. Suppliers CRUD
  const suppRes = await testEndpoint('Get Suppliers', '/suppliers', {}, 200, (d) => {
    return d.status === 'success' && Array.isArray(d.data);
  });

  const createdSupp = await testEndpoint(
    'Create Supplier',
    '/suppliers',
    {
      method: 'POST',
      body: JSON.stringify({
        name: `Temporary Verification Dist ${Date.now().toString().slice(-4)}`,
        contactPerson: 'Karan Sharma',
        phone: '+91 98888 11111',
        email: 'test@healthcare.in',
        address: 'Hitech City, Hyderabad',
      }),
    },
    201,
    (d) => d.status === 'success' && d.data.id !== undefined
  );

  // 6. Purchases (Inward stock)
  let createdPurchase: any = null;
  if (firstMed && createdSupp?.data?.id) {
    createdPurchase = await testEndpoint(
      'Create Purchase Order',
      '/purchases',
      {
        method: 'POST',
        body: JSON.stringify({
          supplierId: createdSupp.data.id,
          items: [
            {
              medicineId: firstMed.id,
              batchNumber: `TEST-PO-${Date.now().toString().slice(-4)}`,
              quantity: 25,
              purchasePrice: 10.0,
              expiryDate: '2028-06-30',
            },
          ],
          notes: 'Automated test purchase order',
        }),
      },
      201,
      (d) => d.status === 'success' && d.data.purchaseNumber !== undefined
    );
  }

  await testEndpoint('Get Purchases List', '/purchases', {}, 200, (d) => {
    return d.status === 'success' && Array.isArray(d.data);
  });

  // 7. Sales (Outward stock with FEFO deduction)
  let createdSale: any = null;
  if (firstMed) {
    createdSale = await testEndpoint(
      'Record Sale (FEFO Deduction)',
      '/sales',
      {
        method: 'POST',
        body: JSON.stringify({
          customerName: 'Test Patient',
          items: [
            {
              medicineId: firstMed.id,
              quantity: 1,
            },
          ],
        }),
      },
      201,
      (d) => d.status === 'success' && d.data.saleNumber !== undefined
    );
  }

  await testEndpoint('Get Sales List', '/sales', {}, 200, (d) => {
    return d.status === 'success' && Array.isArray(d.data);
  });

  // 8. Analytics
  await testEndpoint('Get Dashboard Analytics', '/analytics/dashboard', {}, 200);
  await testEndpoint('Get Sales Analytics', '/analytics/sales', {}, 200);
  await testEndpoint('Get Inventory Analytics', '/analytics/inventory', {}, 200);
  await testEndpoint('Get Purchases Analytics', '/analytics/purchases', {}, 200);

  // 9. Forecasting & Reorders
  await testEndpoint('Get Forecast Overview', '/forecast/overview', {}, 200);
  await testEndpoint('Get Medicine Forecasts', '/forecast/medicines', {}, 200);
  await testEndpoint('Get Reorder Recommendations', '/reorder', {}, 200);
  await testEndpoint('Get Forecast Settings', '/forecast/settings', {}, 200);

  // 10. Reports
  await testEndpoint('Get Sales Report (JSON)', '/reports/sales', {}, 200);
  await testEndpoint('Get Inventory Report (JSON)', '/reports/inventory', {}, 200);
  await testEndpoint('Get Expiry Report (JSON)', '/reports/expiry', {}, 200);
  await testEndpoint('Get Purchases Report (JSON)', '/reports/purchases', {}, 200);

  // 11. Settings
  await testEndpoint('Get Shop Settings', '/settings', {}, 200);

  // 12. Teardown: Clean up temporary test data so database remains clean
  if (newMedRes?.data?.id) {
    await testEndpoint('Teardown Test Medicine', `/inventory/${newMedRes.data.id}`, { method: 'DELETE' }, 200);
  }
  if (createdPurchase?.data?.id) {
    const { getSupabaseClient } = await import('../config/supabase.js');
    const client = getSupabaseClient();
    if (client) {
      await client.from('purchase_items').delete().eq('purchase_id', createdPurchase.data.id);
      await client.from('purchases').delete().eq('id', createdPurchase.data.id);
    }
  }
  if (createdSupp?.data?.id) {
    await testEndpoint('Teardown Test Supplier', `/suppliers/${createdSupp.data.id}`, { method: 'DELETE' }, 200);
  }
  if (createdSale?.data?.id) {
    const { getSupabaseClient } = await import('../config/supabase.js');
    const client = getSupabaseClient();
    if (client) {
      await client.from('sale_items').delete().eq('sale_id', createdSale.data.id);
      await client.from('sales').delete().eq('id', createdSale.data.id);
    }
  }

  console.log('==================================================');
  console.log(`📊 Total Tests: ${passedTests + failedTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log('==================================================');

  server.close();

  if (failedTests > 0) {
    process.exit(1);
  } else {
    console.log('🎉 All API routes and business logic verified successfully!');
    process.exit(0);
  }
}

runVerification();
