import http from 'http';
import app from '../app.js';

async function testBillScanFlow() {
  console.log('==================================================');
  console.log('🧪 Testing AI Bill Scanning & Inventory Entry API');
  console.log('==================================================');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://localhost:${address.port}/api`;

  let passed = 0;
  let failed = 0;

  // 1. OCR Status
  try {
    const res = await fetch(`${baseUrl}/purchases/ocr-status`);
    const json = (await res.json()) as any;
    if (res.status === 200 && json.status === 'success' && json.data) {
      console.log(`✅ [OCR Status] PASSED: provider configured = ${json.data.isConfigured}`);
      passed++;
    } else {
      console.error('❌ [OCR Status] Failed:', json);
      failed++;
    }
  } catch (err: any) {
    console.error('❌ [OCR Status] Error:', err.message);
    failed++;
  }

  // 2. Scan Bill (Sample Bill)
  let extractedData: any = null;
  try {
    const sampleBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const res = await fetch(`${baseUrl}/purchases/scan-bill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileData: `data:image/png;base64,${sampleBase64}`,
        fileName: 'sample_medical_bill.png',
        mimeType: 'image/png',
      }),
    });

    const json = (await res.json()) as any;
    if (res.status === 200 && json.status === 'success' && json.data?.items?.length > 0) {
      extractedData = json.data;
      console.log(`✅ [Scan Sample Bill] PASSED: Extracted ${json.data.items.length} medicines via ${json.data.aiProviderUsed}`);
      console.log(`   Supplier: "${json.data.supplierName}", Invoice: "${json.data.invoiceNumber}", Total: ₹${json.data.totalAmount}`);
      passed++;
    } else {
      console.error('❌ [Scan Sample Bill] Failed:', json);
      failed++;
    }
  } catch (err: any) {
    console.error('❌ [Scan Sample Bill] Error:', err.message);
    failed++;
  }

  // 2b. Scan Live Bill via Gemini 3.8 Flash
  try {
    const sampleBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const res = await fetch(`${baseUrl}/purchases/scan-bill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileData: `data:image/png;base64,${sampleBase64}`,
        fileName: 'actual_purchase_bill.png', // Non-sample filename invokes Gemini 3.8 Flash!
        mimeType: 'image/png',
      }),
    });

    const json = (await res.json()) as any;
    if (res.status === 200 && json.status === 'success' && json.data?.aiProviderUsed === 'gemini-3.8-flash') {
      console.log(`✅ [Gemini 3.8 Flash Live Extraction] PASSED: Successfully connected to models/gemini-3.8-flash`);
      console.log(`   Provider: ${json.data.aiProviderUsed}, Confidence: ${json.data.confidence}`);
      passed++;
    } else {
      console.error('❌ [Gemini 3.8 Flash Live Extraction] Failed:', json);
      failed++;
    }
  } catch (err: any) {
    console.error('❌ [Gemini 3.8 Flash Live Extraction] Error:', err.message);
    failed++;
  }

  // 3. Confirm Bill & Save to Supabase / Inventory
  const testInvoiceNum = `TEST-INV-${Date.now().toString().slice(-5)}`;
  try {
    const confirmPayload = {
      supplierName: extractedData?.supplierName || 'Apex Healthcare Distributors',
      supplierPhone: '+91 98888 22222',
      invoiceNumber: testInvoiceNum,
      invoiceDate: '2026-10-04',
      notes: 'Automated AI Bill Scan Verification Test',
      items: [
        {
          name: 'Amoxicillin 500mg Capsules',
          genericName: 'Amoxicillin',
          category: 'Antibiotics',
          unit: 'capsules',
          batchNumber: `AMX-${Date.now().toString().slice(-4)}`,
          quantity: 50,
          purchasePrice: 14.5,
          sellingPrice: 20.0,
          mfgDate: '2026-01-01',
          expiryDate: '2028-12-31',
          isNewMedicine: true,
        },
        {
          name: 'Cetirizine 10mg Tablets',
          genericName: 'Cetirizine HCl',
          category: 'Antihistamines',
          unit: 'tablets',
          batchNumber: `CET-${Date.now().toString().slice(-4)}`,
          quantity: 100,
          purchasePrice: 3.2,
          sellingPrice: 5.5,
          mfgDate: '2026-02-01',
          expiryDate: '2028-06-30',
          isNewMedicine: true,
        },
      ],
    };

    const res = await fetch(`${baseUrl}/purchases/confirm-bill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(confirmPayload),
    });

    const json = (await res.json()) as any;
    if (res.status === 201 && json.status === 'success' && json.data?.purchase) {
      console.log(`✅ [Confirm Bill] PASSED: Recorded purchase ${json.data.purchase.purchaseNumber}`);
      console.log(`   Total Units: ${json.data.totalQuantity}, Total Amount: ₹${json.data.totalAmount}`);
      console.log(`   Batches Created: ${json.data.batchesCreated.length}, New Meds: ${json.data.newMedicinesCreated.length}`);
      passed++;
    } else {
      console.error('❌ [Confirm Bill] Failed:', json);
      failed++;
    }
  } catch (err: any) {
    console.error('❌ [Confirm Bill] Error:', err.message);
    failed++;
  }

  // 4. Duplicate Invoice Prevention Check
  try {
    const res = await fetch(`${baseUrl}/purchases/confirm-bill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierName: 'Apex Healthcare Distributors',
        invoiceNumber: testInvoiceNum, // duplicate!
        items: [
          {
            name: 'Paracetamol 500mg',
            batchNumber: 'P-1',
            quantity: 10,
            purchasePrice: 5.0,
            sellingPrice: 8.0,
            expiryDate: '2028-12-31',
            category: 'Analgesics',
            unit: 'tablets',
            isNewMedicine: false,
          },
        ],
      }),
    });

    const json = (await res.json()) as any;
    if (res.status === 409 && json.status === 'error' && json.message.includes('already been recorded')) {
      console.log(`✅ [Duplicate Invoice Prevention] PASSED: Correctly blocked duplicate invoice #${testInvoiceNum}`);
      passed++;
    } else {
      console.error('❌ [Duplicate Invoice Prevention] Expected 409 Conflict, received:', res.status, json);
      failed++;
    }
  } catch (err: any) {
    console.error('❌ [Duplicate Invoice Prevention] Error:', err.message);
    failed++;
  }

  server.close();

  console.log('==================================================');
  console.log(`📊 Total Tests: ${passed + failed}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 All AI Bill Scan & Inventory Entry tests passed successfully!');
    process.exit(0);
  }
}

testBillScanFlow();
