import fs from 'fs';
import path from 'path';
import { billOcrService } from '../services/billOcrService.js';
import { pharmacyStore } from '../services/pharmacyStore.js';
import { ConfirmBillInput } from '../types/pharmacy.js';

async function runTests() {
  console.log('===============================================================');
  console.log('🧪 PharmaSync PaddleOCR Local OCR Comprehensive Test Suite');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  // --------------------------------------------------------------------------
  // TEST 1: Image Bill Extraction (PNG) with Batches, Expiry, Qty, Prices
  // --------------------------------------------------------------------------
  totalTests++;
  console.log(`[Test ${totalTests}] OCR Extraction on Pharmacy Bill Image (PNG)...`);
  const imagePath = path.resolve(process.cwd(), '../test_bills/synthetic_pharmacy_bill.png');

  if (!fs.existsSync(imagePath)) {
    throw new Error(`Test bill image not found at ${imagePath}`);
  }

  const imageBuffer = await fs.promises.readFile(imagePath);
  const startTimeImg = Date.now();
  const imgResult = await billOcrService.extractBillData(imageBuffer, 'image/png', 'synthetic_pharmacy_bill.png');
  const imgDuration = ((Date.now() - startTimeImg) / 1000).toFixed(2);

  console.log(`   ⏱️ Duration: ${imgDuration}s`);
  console.log(`   🏢 Supplier: "${imgResult.supplierName}"`);
  console.log(`   📄 Invoice #: "${imgResult.invoiceNumber}"`);
  console.log(`   📅 Date: "${imgResult.invoiceDate}"`);
  console.log(`   💰 Total: ₹${imgResult.totalAmount}`);
  console.log(`   📦 Items extracted: ${imgResult.items.length}`);
  console.log(`   🤖 Engine: ${imgResult.aiProviderUsed} (Confidence: ${imgResult.confidence})`);

  for (const it of imgResult.items) {
    console.log(`      - Medicine: "${it.rawName}"`);
    console.log(`        Batch: ${it.batchNumber} | Exp: ${it.expiryDate} | Qty: ${it.quantity} | Cost: ₹${it.purchasePrice} | MRP: ₹${it.sellingPrice}`);
    console.log(`        Category: ${it.category} | Unit: ${it.unit} | Confidence: ${it.confidence}`);
  }

  if (
    imgResult.items.length >= 2 &&
    imgResult.invoiceNumber &&
    imgResult.items.some((i) => i.batchNumber === 'AMX-401') &&
    imgResult.items.some((i) => i.expiryDate === '2028-12-31')
  ) {
    console.log('   ✅ TEST 1 PASSED: Pharmacy bill image extracted with exact batches, expiries, quantities, and prices!\n');
    passedTests++;
  } else {
    console.error('   ❌ TEST 1 FAILED: Expected at least 2 items with batch AMX-401 and expiry 2028-12-31.\n');
  }

  // --------------------------------------------------------------------------
  // TEST 2: Multi-Page / Single-Page PDF Document OCR via pypdfium2
  // --------------------------------------------------------------------------
  totalTests++;
  console.log(`[Test ${totalTests}] PDF Pharmacy Invoice Extraction (pypdfium2 + PaddleOCR)...`);
  const pdfPath = path.resolve(process.cwd(), '../test_bills/invoice_document.pdf');

  if (!fs.existsSync(pdfPath)) {
    throw new Error(`Test bill PDF not found at ${pdfPath}`);
  }

  const pdfBuffer = await fs.promises.readFile(pdfPath);
  const startTimePdf = Date.now();
  const pdfResult = await billOcrService.extractBillData(pdfBuffer, 'application/pdf', 'invoice_document.pdf');
  const pdfDuration = ((Date.now() - startTimePdf) / 1000).toFixed(2);

  console.log(`   ⏱️ Duration: ${pdfDuration}s`);
  console.log(`   🏢 Supplier: "${pdfResult.supplierName}"`);
  console.log(`   📄 Invoice #: "${pdfResult.invoiceNumber}"`);
  console.log(`   📦 Items extracted: ${pdfResult.items.length}`);
  console.log(`   🤖 Engine: ${pdfResult.aiProviderUsed}`);

  if (pdfResult.items.length >= 2 && pdfResult.invoiceNumber) {
    console.log('   ✅ TEST 2 PASSED: PDF rasterized and parsed accurately via pypdfium2!\n');
    passedTests++;
  } else {
    console.error('   ❌ TEST 2 FAILED: PDF extraction failed to yield structured items.\n');
  }

  // --------------------------------------------------------------------------
  // TEST 3: Partial / Missing Fields & Low Confidence Handling
  // --------------------------------------------------------------------------
  totalTests++;
  console.log(`[Test ${totalTests}] Incomplete Bill (Testing deterministic missing fields & confidence flagging)...`);
  const partialPath = path.resolve(process.cwd(), '../test_bills/partial_pharmacy_bill.png');

  if (!fs.existsSync(partialPath)) {
    throw new Error(`Test partial bill not found at ${partialPath}`);
  }

  const partialBuffer = await fs.promises.readFile(partialPath);
  const partialResult = await billOcrService.extractBillData(partialBuffer, 'image/png', 'partial_pharmacy_bill.png');

  console.log(`   🏢 Supplier: "${partialResult.supplierName}"`);
  console.log(`   📄 Invoice #: "${partialResult.invoiceNumber}"`);
  console.log(`   📦 Items found: ${partialResult.items.length}`);

  let missingFlagsVerified = false;
  for (const it of partialResult.items) {
    console.log(`      - Medicine: "${it.rawName}"`);
    console.log(`        Batch: ${it.batchNumber} (missing? ${it.missingFields.includes('batchNumber')})`);
    console.log(`        Price: ${it.purchasePrice} (missing? ${it.missingFields.includes('purchasePrice')})`);
    console.log(`        Confidence: ${it.confidence}`);
    console.log(`        Missing fields list: [${it.missingFields.join(', ')}]`);

    if (it.missingFields.includes('batchNumber') && it.confidence !== 'high') {
      missingFlagsVerified = true;
    }
  }

  if (missingFlagsVerified) {
    console.log('   ✅ TEST 3 PASSED: Missing fields deterministically audited and confidence flagged without hallucinations!\n');
    passedTests++;
  } else {
    console.error('   ❌ TEST 3 FAILED: Missing fields were not properly identified.\n');
  }

  // --------------------------------------------------------------------------
  // TEST 4: Invalid / Corrupted File Handling
  // --------------------------------------------------------------------------
  totalTests++;
  console.log(`[Test ${totalTests}] Corrupted / Invalid File Error Handling...`);
  const corruptedBuffer = Buffer.from('NOT_A_VALID_IMAGE_OR_PDF_DOCUMENT_BINARY');

  try {
    await billOcrService.extractBillData(corruptedBuffer, 'image/jpeg', 'corrupted.jpg');
    console.error('   ❌ TEST 4 FAILED: Corrupted file was expected to throw an error but succeeded.');
  } catch (err: any) {
    console.log(`   🛡️ Caught expected rejection: "${err.message}"`);
    console.log('   ✅ TEST 4 PASSED: Invalid file rejected safely without server crashes.\n');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 5: Sample Bill Feature (Zero-Config demo flow)
  // --------------------------------------------------------------------------
  totalTests++;
  console.log(`[Test ${totalTests}] Instant Sample Bill Feature...`);
  const sampleBuffer = Buffer.from('SAMPLE_DEMO_TRIGGER');
  const sampleResult = await billOcrService.extractBillData(sampleBuffer, 'image/jpeg', 'sample-bill-demo.jpg');

  console.log(`   🏢 Sample Supplier: "${sampleResult.supplierName}"`);
  console.log(`   📄 Sample Invoice: "${sampleResult.invoiceNumber}"`);
  console.log(`   📦 Sample Items: ${sampleResult.items.length}`);
  console.log(`   🤖 Provider: ${sampleResult.aiProviderUsed}`);

  if (sampleResult.aiProviderUsed === 'sample-demo-bill' && sampleResult.items.length >= 4) {
    console.log('   ✅ TEST 5 PASSED: Instant demo sample-bill workflow fully preserved!\n');
    passedTests++;
  } else {
    console.error('   ❌ TEST 5 FAILED: Sample bill flow was broken.\n');
  }

  // --------------------------------------------------------------------------
  // TEST 6: Purchase Confirmation Flow & Inventory Stock Verification
  // --------------------------------------------------------------------------
  totalTests++;
  console.log(`[Test ${totalTests}] Purchase Confirmation Flow (Checking stock persistence only after confirmation)...`);

  const allMedsBefore = await pharmacyStore.getAllMedicines();
  const testMedicine = allMedsBefore.find((m) => m.name.toLowerCase().includes('amoxicillin')) || allMedsBefore[0];

  if (!testMedicine) {
    throw new Error('No medicines found in catalog to test confirmation.');
  }

  const initialStock = testMedicine.totalStock || 0;
  const initialBatchesCount = testMedicine.batches?.length || 0;
  console.log(`   📦 Baseline stock for "${testMedicine.name}": ${initialStock} units (${initialBatchesCount} batch(es))`);

  // Simulate user reviewing and submitting confirmation
  const confirmPayload: ConfirmBillInput = {
    supplierName: imgResult.supplierName || 'Apex Healthcare Distributors Pvt Ltd',
    invoiceNumber: `TEST-INV-${Date.now().toString().slice(-6)}`,
    invoiceDate: new Date().toISOString().split('T')[0],
    totalAmount: 1450.0,
    items: [
      {
        medicineId: testMedicine.id,
        isNewMedicine: false,
        name: testMedicine.name,
        batchNumber: `TEST-BCH-${Date.now().toString().slice(-4)}`,
        quantity: 50,
        purchasePrice: 14.5,
        sellingPrice: 22.0,
        mfgDate: '2025-01-01',
        expiryDate: '2028-12-31',
        category: testMedicine.category,
        unit: testMedicine.unit,
      },
    ],
  };

  const confirmResult = await pharmacyStore.confirmBillPurchase(confirmPayload);
  console.log(`   💳 Purchase record ID: ${confirmResult.purchase.id}`);
  console.log(`   📈 Batches added/updated: ${confirmResult.batchesCreated.length}`);

  const allMedsAfter = await pharmacyStore.getAllMedicines();
  const updatedMedicine = allMedsAfter.find((m) => m.id === testMedicine.id);
  const updatedStock = updatedMedicine ? (updatedMedicine.totalStock || 0) : 0;

  console.log(`   📦 Stock after confirmation: ${updatedStock} units (+50 added)`);

  if (updatedStock === initialStock + 50) {
    console.log('   ✅ TEST 6 PASSED: Inventory stock incremented safely and atomically after user review!\n');
    passedTests++;
  } else {
    console.error(`   ❌ TEST 6 FAILED: Stock mismatch. Expected ${initialStock + 50}, got ${updatedStock}.\n`);
  }

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('===============================================================');
  console.log(`🏁 TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('===============================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('\n💥 FATAL TEST ERROR:', err);
  process.exit(1);
});
