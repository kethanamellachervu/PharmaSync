import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import { pharmacyStore } from './pharmacyStore.js';
import { scanProgressService } from './scanProgressService.js';
import {
  ExtractedBillData,
  ExtractedBillItem,
  Medicine,
  MedicineWithBatches,
  Supplier,
} from '../types/pharmacy.js';

const execFileAsync = promisify(execFile);

export interface IndexedMedicine {
  medicine: Medicine | MedicineWithBatches;
  cleanName: string;
  cleanGeneric: string | null;
}

interface RawExtractedItem {
  id?: string;
  name?: string;
  rawName?: string;
  genericName?: string;
  category?: string;
  unit?: string;
  batchNumber?: string | null;
  quantity?: number | null;
  purchasePrice?: number | null;
  sellingPrice?: number | null;
  lineAmount?: number | null;
  needsVerification?: boolean;
  verificationReason?: string | null;
  sNo?: number | null;
  mfgDate?: string | null;
  expiryDate?: string | null;
  confidence?: 'high' | 'medium' | 'low';
  missingFields?: string[];
}

interface RawExtractedBill {
  supplierName?: string | null;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  totalAmount?: number | null;
  items: RawExtractedItem[];
  confidence?: 'high' | 'medium' | 'low';
  aiProviderUsed?: string;
  warnings?: string[];
}

/**
 * Locate the local Python executable inside the isolated `ocr-venv` virtual environment.
 */
export function getPythonExecutablePath(): string {
  const projectRoot = path.resolve(process.cwd(), '..');
  const candidates = [
    path.join(projectRoot, 'ocr-venv', 'Scripts', 'python.exe'),
    path.join(process.cwd(), 'ocr-venv', 'Scripts', 'python.exe'),
    path.join(projectRoot, 'ocr-venv', 'bin', 'python'),
    path.join(process.cwd(), 'ocr-venv', 'bin', 'python'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Fallback if virtualenv path is in standard location
  return process.platform === 'win32' ? 'python.exe' : 'python3';
}

/**
 * Locate the project root containing `ocr_service/`
 */
export function getOcrProjectRoot(): string {
  const projectRoot = path.resolve(process.cwd(), '..');
  if (fs.existsSync(path.join(projectRoot, 'ocr_service', 'engine.py'))) {
    return projectRoot;
  }
  if (fs.existsSync(path.join(process.cwd(), 'ocr_service', 'engine.py'))) {
    return process.cwd();
  }
  return projectRoot;
}

export class BillOcrService {
  // 0 = No timeout limit; allows long-running high-resolution and multi-page invoices to complete naturally
  public static readonly OCR_TIMEOUT_MS = 0;

  /**
   * Main entry point to extract structured invoice data from an uploaded bill (image or PDF).
   */
  public async extractBillData(
    fileBuffer: Buffer,
    mimeType: string,
    fileName = 'bill',
    scanId?: string
  ): Promise<ExtractedBillData> {
    const tScanStart = Date.now();
    const warnings: string[] = [];
    let rawBill: RawExtractedBill | null = null;
    let aiProviderUsed = 'paddleocr-local';
    let overallConfidence: 'high' | 'medium' | 'low' = 'low';

    const normalizedMime = this.normalizeMimeType(mimeType, fileName);
    const isSampleRequest = fileName.toLowerCase().includes('sample');

    if (scanId) {
      scanProgressService.initProgress(scanId, `Starting analysis of "${fileName}"...`);
    }

    // 1. Explicit Sample Bill request for zero-config demonstration
    if (isSampleRequest) {
      if (scanId) {
        scanProgressService.setStep(scanId, 2, 'Processing deterministic sample invoice lines...');
      }
      rawBill = this.extractWithRuleBasedParser(fileBuffer, fileName);
      aiProviderUsed = 'sample-demo-bill';
      overallConfidence = 'high';
      warnings.push('Displaying verified sample bill dataset for testing and review.');
    } else {
      // 2. Real bill upload: Use local PaddleOCR Python engine
      try {
        if (scanId) {
          scanProgressService.setStep(scanId, 0, 'Document preparation & PDF page rasterization...');
        }
        const ocrT0 = Date.now();
        rawBill = await this.extractWithPaddleOCR(fileBuffer, fileName, normalizedMime, scanId);
        console.log(`[BillScanTiming] PaddleOCR + Python engine execution took ${Date.now() - ocrT0}ms`);
        aiProviderUsed = rawBill.aiProviderUsed || 'paddleocr-local';
        overallConfidence = rawBill.confidence || 'medium';
        if (rawBill.warnings && rawBill.warnings.length > 0) {
          warnings.push(...rawBill.warnings);
        }
      } catch (err: any) {
        console.error('[BillOcrService] PaddleOCR extraction failed:', err.message);
        if (scanId) {
          scanProgressService.setError(scanId, `Local OCR document analysis failed: ${err.message}`);
        }
        throw new Error(`Local OCR document analysis failed: ${err.message}`);
      }
    }

    if (!rawBill) {
      if (scanId) {
        scanProgressService.setError(scanId, 'Unable to extract invoice fields from the provided document.');
      }
      throw new Error('Unable to extract invoice fields from the provided document.');
    }

    if (scanId) {
      scanProgressService.setStep(
        scanId,
        3,
        `Validating ${rawBill.items?.length || 0} medicine line(s) against pharmacy catalog & database...`
      );
    }

    // 3. Match items and supplier against Supabase / Pharmacy Store catalog
    const tValidation0 = Date.now();
    const tDbFetch0 = Date.now();
    const [existingMedicines, existingSuppliers] = await Promise.all([
      pharmacyStore.getCatalogMedicines().catch(() => [] as Medicine[]),
      pharmacyStore.getCatalogSuppliers().catch(() => [] as Supplier[]),
    ]);
    const dbFetchDuration = Date.now() - tDbFetch0;
    console.log(
      `[CatalogValidation] Fetched catalog data in ${dbFetchDuration}ms (${existingMedicines.length} medicines, ${existingSuppliers.length} suppliers)`
    );

    const tSupp0 = performance.now();
    const matchedSupplier = this.matchSupplier(rawBill.supplierName || undefined, existingSuppliers);
    console.log(
      `[CatalogValidation] Supplier "${rawBill.supplierName}": ${
        matchedSupplier ? `Matched -> "${matchedSupplier.name}" (ID: ${matchedSupplier.id})` : 'No Match'
      } in ${(performance.now() - tSupp0).toFixed(3)}ms`
    );

    // Pre-index medicines once for O(1) exact matching and fast string comparisons
    const tIndex0 = performance.now();
    const { exactMap, items: indexedMeds } = this.buildCatalogIndex(existingMedicines);
    console.log(
      `[CatalogValidation] Pre-indexed ${existingMedicines.length} catalog medicines in ${(
        performance.now() - tIndex0
      ).toFixed(2)}ms`
    );

    const tMatchingAll0 = performance.now();
    let matchedCount = 0;
    const enrichedItems: ExtractedBillItem[] = (rawBill.items || []).map((item, index) => {
      const medicineName = item.name || item.rawName || 'Unnamed Medicine';
      const tItemMatch0 = performance.now();
      const match = this.matchIndexedMedicine(medicineName, exactMap, indexedMeds);
      const itemDuration = (performance.now() - tItemMatch0).toFixed(3);

      if (match) {
        matchedCount++;
        console.log(
          `[CatalogValidation] Item ${index + 1} "${medicineName}": Matched -> "${match.name}" (ID: ${match.id}) in ${itemDuration}ms`
        );
      } else {
        console.log(
          `[CatalogValidation] Item ${index + 1} "${medicineName}": No catalog match (New item) in ${itemDuration}ms`
        );
      }

      const missingFields: string[] = [];
      const cleanBatch = item.batchNumber ? item.batchNumber.trim().toUpperCase() : null;
      const cleanExpiry = this.normalizeDate(item.expiryDate);
      const cleanMfg = this.normalizeDate(item.mfgDate);
      const qty = item.quantity && Number(item.quantity) > 0 ? Math.round(Number(item.quantity)) : null;
      const price = item.purchasePrice !== undefined && item.purchasePrice !== null ? Number(item.purchasePrice) : null;
      const lineAmt = item.lineAmount !== undefined && item.lineAmount !== null ? Number(item.lineAmount) : null;
      const selling = item.sellingPrice !== undefined && item.sellingPrice !== null
        ? Number(item.sellingPrice)
        : match
        ? match.sellingPrice
        : price
        ? Math.round(price * 1.15 * 100) / 100
        : null;

      // Arithmetic Validation: quantity * purchasePrice ≈ lineAmount
      let needsVerification = item.needsVerification || false;
      let verificationReason = item.verificationReason || null;
      if (qty && price !== null && lineAmt !== null) {
        const expected = Math.round(qty * price * 100) / 100;
        const diff = Math.abs(expected - lineAmt);
        if (diff > Math.max(0.05, 0.02 * lineAmt)) {
          needsVerification = true;
          verificationReason = `Line amount mismatch: extracted ₹${lineAmt.toFixed(2)}, calculated ₹${expected.toFixed(2)} (${qty} × ₹${price.toFixed(2)})`;
        }
      } else if (!qty) {
        needsVerification = true;
        if (!verificationReason) verificationReason = 'Quantity missing or unverified';
      }

      if (!cleanBatch) missingFields.push('batchNumber');
      if (!cleanExpiry) missingFields.push('expiryDate');
      if (!qty) missingFields.push('quantity');
      if (price === null) missingFields.push('purchasePrice');

      let itemConfidence: 'high' | 'medium' | 'low' = item.confidence || 'high';
      if (needsVerification && itemConfidence === 'high') {
        itemConfidence = 'medium';
      }
      if (missingFields.length >= 2) itemConfidence = 'low';
      else if (missingFields.length === 1) itemConfidence = 'medium';

      return {
        id: item.id || `extracted-item-${index + 1}-${Date.now()}`,
        rawName: medicineName,
        matchedMedicineId: match ? match.id : null,
        matchedMedicineName: match ? match.name : null,
        batchNumber: cleanBatch,
        quantity: qty,
        purchasePrice: price,
        sellingPrice: selling,
        lineAmount: lineAmt,
        needsVerification,
        verificationReason,
        sNo: item.sNo || null,
        mfgDate: cleanMfg,
        expiryDate: cleanExpiry,
        category: match ? match.category : item.category || this.inferCategory(medicineName),
        unit: item.unit || (match ? match.unit : 'tablets'),
        confidence: itemConfidence,
        missingFields,
      };
    });

    const totalMatchingDuration = (performance.now() - tMatchingAll0).toFixed(2);
    const totalValidationDuration = Date.now() - tValidation0;
    console.log(
      `[CatalogValidation] Medicine matching complete: ${matchedCount}/${enrichedItems.length} matched in ${totalMatchingDuration}ms`
    );
    console.log(`[CatalogValidation] Total validation step took ${totalValidationDuration}ms`);

    // Compute or verify total amount
    const computedTotal = enrichedItems.reduce(
      (sum, it) => sum + (it.quantity || 0) * (it.purchasePrice || 0),
      0
    );
    const finalTotal = rawBill.totalAmount ? Number(rawBill.totalAmount) : Math.round(computedTotal * 100) / 100;

    const totalPipelineDuration = Date.now() - tScanStart;
    console.log(`[BillScanTiming] Complete bill scanning pipeline took ${totalPipelineDuration}ms (OCR + Validation)`);

    if (scanId) {
      scanProgressService.setStep(
        scanId,
        4,
        `Validation complete! ${matchedCount}/${enrichedItems.length} medicines verified against database.`,
        {
          medicinesExtracted: enrichedItems.length,
          totalTimeMs: totalPipelineDuration,
        }
      );
    }

    return {
      supplierName: rawBill.supplierName || (matchedSupplier ? matchedSupplier.name : null),
      matchedSupplierId: matchedSupplier ? matchedSupplier.id : null,
      invoiceNumber: rawBill.invoiceNumber || null,
      invoiceDate: this.normalizeDate(rawBill.invoiceDate),
      totalAmount: finalTotal,
      items: enrichedItems,
      aiProviderUsed,
      confidence: overallConfidence,
      warnings,
      scanId,
    };
  }

  /**
   * Invoke local PaddleOCR Python service via `ocr-venv`
   */
  private async extractWithPaddleOCR(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    scanId?: string
  ): Promise<RawExtractedBill> {
    if (scanId) {
      scanProgressService.setStep(scanId, 1, 'Running PaddleOCR neural text detection & recognition on document...');
    }
    const pythonExe = getPythonExecutablePath();
    const projectRoot = getOcrProjectRoot();

    // Determine temporary file extension
    let ext = path.extname(fileName).toLowerCase();
    if (!ext || ext.length <= 1) {
      if (mimeType.includes('pdf')) ext = '.pdf';
      else if (mimeType.includes('png')) ext = '.png';
      else if (mimeType.includes('webp')) ext = '.webp';
      else ext = '.jpg';
    }

    const tempFileName = `bill_ocr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    const tempFilePath = path.join(os.tmpdir(), tempFileName);

    try {
      await fs.promises.writeFile(tempFilePath, fileBuffer);

      return await new Promise<RawExtractedBill>((resolve, reject) => {
        const child = spawn(
          pythonExe,
          ['-m', 'ocr_service.engine', tempFilePath],
          {
            cwd: projectRoot,
            env: {
              ...process.env,
              PYTHONIOENCODING: 'utf-8',
              GLOG_minloglevel: '2',
              FLAGS_call_stack_level: '0',
            },
          }
        );

        let stdoutData = '';
        let stderrData = '';

        child.stdout.on('data', (chunk) => {
          stdoutData += chunk.toString('utf-8');
        });

        child.stderr.on('data', (chunk) => {
          const text = chunk.toString('utf-8');
          stderrData += text;

          if (scanId) {
            const lines = text.split('\n');
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;

              if (trimmed.includes('[DocLoader] Rasterized PDF page')) {
                const match = trimmed.match(/page (\d+\/\d+)/i);
                scanProgressService.setStep(
                  scanId,
                  0,
                  `Rasterizing PDF ${match ? `page ${match[1]}` : 'pages'} for deep learning analysis...`
                );
              } else if (trimmed.includes('[PaddleOCR] Initializing PaddleOCR')) {
                scanProgressService.setStep(
                  scanId,
                  1,
                  'Loading local deep learning PaddleOCR models into memory...'
                );
              } else if (trimmed.includes('[PaddleOCR] Processing page')) {
                const match = trimmed.match(/page (\d+\/\d+)/i);
                scanProgressService.setStep(
                  scanId,
                  1,
                  `Analyzing text and layout ${match ? `on page ${match[1]}` : ''}...`
                );
              } else if (trimmed.includes('[PaddleOCR] Text detection completed')) {
                const match = trimmed.match(/(\d+) bounding box/i);
                scanProgressService.setStep(
                  scanId,
                  1,
                  `Detected ${match ? `${match[1]} text regions` : 'text'}. Running character recognition...`
                );
              } else if (trimmed.includes('[PaddleOCR] Text recognition completed')) {
                scanProgressService.setStep(
                  scanId,
                  2,
                  'Character recognition complete. Structuring invoice lines and medicine fields...'
                );
              } else if (trimmed.includes('[PaddleOCR] Starting deterministic invoice parser')) {
                scanProgressService.setStep(
                  scanId,
                  2,
                  'Parsing invoice items, batch numbers, and prices...'
                );
              }
            }
          }
        });

        child.on('error', (err) => {
          reject(err);
        });

        child.on('close', (code) => {
          if (code !== 0) {
            const errSnippet = stderrData.trim().slice(-400) || `Process exited with code ${code}`;
            return reject(new Error(`Local OCR process failed (code ${code}): ${errSnippet}`));
          }

          try {
            const stdoutStr = stdoutData.trim();
            let parsed: any = null;

            try {
              parsed = JSON.parse(stdoutStr);
            } catch {
              const startIdx = stdoutStr.indexOf('{');
              const endIdx = stdoutStr.lastIndexOf('}');
              if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
                parsed = JSON.parse(stdoutStr.substring(startIdx, endIdx + 1));
              } else {
                return reject(new Error(`Engine returned non-JSON output: ${stdoutStr.slice(0, 300)}`));
              }
            }

            if (parsed.error) {
              return reject(new Error(parsed.error));
            }

            resolve(parsed as RawExtractedBill);
          } catch (err) {
            reject(err);
          }
        });
      });
    } finally {
      // Always cleanup temporary file
      try {
        if (fs.existsSync(tempFilePath)) {
          await fs.promises.unlink(tempFilePath);
        }
      } catch {
        // Ignore temporary file cleanup errors
      }
    }
  }

  /**
   * Intelligent Rule-based / Sample Bill fallback parser
   * Provides structured sample data when user clicks "Try Sample Purchase Bill"
   */
  private extractWithRuleBasedParser(fileBuffer: Buffer, fileName: string): RawExtractedBill {
    const textContent = fileBuffer.toString('utf-8');

    if (textContent.includes('INVOICE') || textContent.includes('Bill') || textContent.includes('Supplier')) {
      const parsed = this.parseRawInvoiceText(textContent);
      if (parsed.items.length > 0) return parsed;
    }

    const today = new Date();
    const invoiceNum = `INV-${today.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const dateStr = today.toISOString().split('T')[0];

    return {
      supplierName: 'Apex Healthcare Distributors Pvt Ltd',
      invoiceNumber: invoiceNum,
      invoiceDate: dateStr,
      totalAmount: 4350.0,
      items: [
        {
          name: 'Amoxicillin 500mg Capsules',
          genericName: 'Amoxicillin',
          category: 'Antibiotics',
          unit: 'capsules',
          batchNumber: `AMX-${Math.floor(100 + Math.random() * 900)}`,
          quantity: 100,
          purchasePrice: 15.5,
          sellingPrice: 22.0,
          mfgDate: '2024-01-10',
          expiryDate: '2026-12-31',
        },
        {
          name: 'Azithromycin 500mg Tablets',
          genericName: 'Azithromycin',
          category: 'Antibiotics',
          unit: 'tablets',
          batchNumber: `AZI-${Math.floor(100 + Math.random() * 900)}`,
          quantity: 60,
          purchasePrice: 28.0,
          sellingPrice: 40.0,
          mfgDate: '2024-02-15',
          expiryDate: '2027-02-28',
        },
        {
          name: 'Cetirizine 10mg Tablets',
          genericName: 'Cetirizine HCl',
          category: 'Antihistamines',
          unit: 'tablets',
          batchNumber: `CET-${Math.floor(100 + Math.random() * 900)}`,
          quantity: 120,
          purchasePrice: 3.5,
          sellingPrice: 6.0,
          mfgDate: '2024-03-01',
          expiryDate: '2027-08-31',
        },
        {
          name: 'Pantoprazole 40mg Tablets',
          genericName: 'Pantoprazole Sodium',
          category: 'Gastrointestinal',
          unit: 'tablets',
          batchNumber: `PAN-${Math.floor(100 + Math.random() * 900)}`,
          quantity: 80,
          purchasePrice: 8.5,
          sellingPrice: 14.0,
          mfgDate: '2024-01-20',
          expiryDate: '2026-11-30',
        },
      ],
    };
  }

  private parseRawInvoiceText(text: string): RawExtractedBill {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    let supplierName = '';
    let invoiceNumber = '';
    let invoiceDate = '';

    for (const line of lines) {
      if (/supplier|vendor|from:/i.test(line)) {
        supplierName = line.split(/[:\-]/)[1]?.trim() || '';
      }
      if (/inv|invoice|bill\s*no/i.test(line)) {
        invoiceNumber = line.split(/[:\-]/)[1]?.trim() || '';
      }
      if (/date/i.test(line)) {
        const match = line.match(/\d{4}-\d{2}-\d{2}|\d{2}[-/]\d{2}[-/]\d{4}/);
        if (match) invoiceDate = match[0];
      }
    }

    return {
      supplierName: supplierName || 'MedPharma Wholesale Supplies',
      invoiceNumber: invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
      invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
      items: [],
    };
  }

  /**
   * Pre-indexes existing medicines into a map and pre-normalized item list
   * to enable instant O(1) exact matching and avoid repetitive regex evaluation in loops.
   */
  public buildCatalogIndex(medicines: (Medicine | MedicineWithBatches)[]): {
    exactMap: Map<string, Medicine | MedicineWithBatches>;
    items: IndexedMedicine[];
  } {
    const exactMap = new Map<string, Medicine | MedicineWithBatches>();
    const items: IndexedMedicine[] = [];

    for (const m of medicines) {
      const cleanName = this.normalizeMedicineName(m.name);
      const cleanGeneric = m.genericName ? this.normalizeMedicineName(m.genericName) : null;
      if (!exactMap.has(cleanName)) {
        exactMap.set(cleanName, m);
      }
      items.push({ medicine: m, cleanName, cleanGeneric });
    }

    return { exactMap, items };
  }

  /**
   * Fast medicine matching against pre-indexed catalog structures.
   * Preserves exact, contains, and generic matching priorities without regex repetition.
   */
  public matchIndexedMedicine(
    rawName: string,
    exactMap: Map<string, Medicine | MedicineWithBatches>,
    items: IndexedMedicine[]
  ): Medicine | MedicineWithBatches | null {
    if (!rawName || items.length === 0) return null;
    const cleanRaw = this.normalizeMedicineName(rawName);

    // 1. Exact match via O(1) lookup
    const exact = exactMap.get(cleanRaw);
    if (exact) return exact;

    // 2. Starts with / contains match (pre-normalized strings, no regex in loop)
    const subMatch = items.find((it) => it.cleanName.includes(cleanRaw) || cleanRaw.includes(it.cleanName));
    if (subMatch) return subMatch.medicine;

    // 3. Generic name match (pre-normalized strings, no regex in loop)
    const genericMatch = items.find((it) => it.cleanGeneric && cleanRaw.includes(it.cleanGeneric));
    if (genericMatch) return genericMatch.medicine;

    return null;
  }

  /**
   * Matches an extracted medicine name to the existing catalog.
   * Backward-compatible interface for callers providing an un-indexed array.
   */
  public matchMedicine(
    rawName: string,
    existingMedicines: (Medicine | MedicineWithBatches)[]
  ): (Medicine | MedicineWithBatches) | null {
    if (!rawName || existingMedicines.length === 0) return null;
    const { exactMap, items } = this.buildCatalogIndex(existingMedicines);
    return this.matchIndexedMedicine(rawName, exactMap, items);
  }

  /**
   * Matches an extracted supplier name to existing suppliers.
   */
  public matchSupplier(rawName: string | undefined, suppliers: Supplier[]): Supplier | null {
    if (!rawName || suppliers.length === 0) return null;
    const cleanRaw = rawName.toLowerCase().replace(/[^a-z0-9]/g, '');

    return (
      suppliers.find((s) => {
        const cleanS = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        return cleanS === cleanRaw || cleanS.includes(cleanRaw) || cleanRaw.includes(cleanS);
      }) || null
    );
  }

  private normalizeMedicineName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\b(tab|tablets|cap|capsules|syrup|injection|drops|strip|bottle|mg|ml|mcg|gm)\b/gi, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  private normalizeDate(dateStr?: string | null): string | null {
    if (!dateStr) return null;
    const trimmed = dateStr.trim();

    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

    // DD/MM/YYYY or DD-MM-YYYY
    const dmy = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (dmy) {
      const day = dmy[1].padStart(2, '0');
      const month = dmy[2].padStart(2, '0');
      const year = dmy[3];
      return `${year}-${month}-${day}`;
    }

    // MM/YY or MM-YY (e.g. 08/26 -> 2026-08-31)
    const my = trimmed.match(/^(\d{1,2})[-/.](\d{2})$/);
    if (my) {
      const month = Number(my[1]);
      const year = 2000 + Number(my[2]);
      if (month >= 1 && month <= 12) {
        const lastDay = new Date(year, month, 0).getDate();
        return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      }
    }

    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    return null;
  }

  private normalizeMimeType(mime: string, fileName: string): string {
    if (mime && mime !== 'application/octet-stream') return mime;
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return 'application/pdf';
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'jpg':
      case 'jpeg':
      default:
        return 'image/jpeg';
    }
  }

  private inferCategory(medicineName: string): string {
    const lower = medicineName.toLowerCase();
    if (/cillin|mycin|oxacin|cef|cyclin|amox/i.test(lower)) return 'Antibiotics';
    if (/paracetamol|ibuprofen|diclofenac|aspirin|tramadol|aceclofenac/i.test(lower)) return 'Analgesics';
    if (/metformin|glimepiride|insulin|glipizide|vildagliptin/i.test(lower)) return 'Antidiabetics';
    if (/cetirizine|loratadine|fexofenadine|chlorpheniramine/i.test(lower)) return 'Antihistamines';
    if (/amlodipine|losartan|telmisartan|atenolol|atorvastatin/i.test(lower)) return 'Cardiovascular';
    if (/prazole|pantoprazole|omeprazole|ranitidine|antacid/i.test(lower)) return 'Gastrointestinal';
    if (/salbutamol|montelukast|budesonide|cough|dextromethorphan/i.test(lower)) return 'Respiratory';
    if (/vitamin|calcium|zinc|iron|folic|b-complex/i.test(lower)) return 'Vitamins';
    return 'General';
  }
}

export const billOcrService = new BillOcrService();
