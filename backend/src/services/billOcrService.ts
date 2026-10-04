import { GoogleGenAI } from '@google/genai';
import { envConfig } from '../config/env.js';
import { pharmacyStore } from './pharmacyStore.js';
import {
  ExtractedBillData,
  ExtractedBillItem,
  MedicineWithBatches,
  Supplier,
} from '../types/pharmacy.js';

interface RawExtractedItem {
  name: string;
  genericName?: string;
  category?: string;
  unit?: string;
  batchNumber?: string;
  quantity?: number;
  purchasePrice?: number;
  sellingPrice?: number;
  mfgDate?: string;
  expiryDate?: string;
}

interface RawExtractedBill {
  supplierName?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  totalAmount?: number;
  items: RawExtractedItem[];
}

/**
 * Detect permanent errors that should NOT be retried (e.g. invalid key, model deprecation, permission)
 */
export function isPermanentGeminiError(err: any): boolean {
  if (!err) return false;
  const status = err.status || err.code || err.statusCode;
  if (status === 400 || status === 401 || status === 403 || status === 404) return true;

  const msg = (err.message || '').toLowerCase();
  return (
    msg.includes('api_key_invalid') ||
    msg.includes('api key not valid') ||
    msg.includes('permission_denied') ||
    msg.includes('not_found') ||
    msg.includes('unsupported model') ||
    msg.includes('invalid_argument') ||
    msg.includes('no longer available')
  );
}

/**
 * Detect transient/temporary errors that SHOULD be retried (503, 429, 500, 502, 504, high demand)
 */
export function isTransientGeminiError(err: any): boolean {
  if (!err) return false;
  if (isPermanentGeminiError(err)) return false;

  const status = err.status || err.code || err.statusCode;
  if (status === 503 || status === 429 || status === 500 || status === 502 || status === 504) return true;

  const msg = (err.message || '').toLowerCase();
  return (
    msg.includes('503') ||
    msg.includes('429') ||
    msg.includes('500') ||
    msg.includes('502') ||
    msg.includes('504') ||
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('resource_exhausted') ||
    msg.includes('rate limit') ||
    msg.includes('overloaded') ||
    msg.includes('deadline exceeded') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('timeout')
  );
}

/**
 * Format a clear, human-friendly error message for the frontend UI
 */
export function formatGeminiErrorMessage(err: any): string {
  if (!err) return 'Gemini AI document extraction failed.';

  const rawMsg = err.message || '';
  let extractedDetail = rawMsg;
  try {
    const jsonMatch = rawMsg.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.error?.message) {
        extractedDetail = parsed.error.message;
      }
    }
  } catch {
    // Keep rawMsg
  }

  if (isTransientGeminiError(err)) {
    return 'Gemini AI is temporarily experiencing high demand (503 UNAVAILABLE). Google servers are busy. Please wait a moment and click "Retry AI Scan", or test with "Try Sample Purchase Bill".';
  }

  if (isPermanentGeminiError(err)) {
    return `Gemini AI configuration error: ${extractedDetail}. Please check your GEMINI_API_KEY in backend/.env.`;
  }

  return `Gemini AI extraction error: ${extractedDetail}. Please verify your purchase bill image/PDF and try again.`;
}

export class BillOcrService {
  private geminiClient: GoogleGenAI | null = null;

  constructor() {
    if (envConfig.geminiApiKey) {
      try {
        this.geminiClient = new GoogleGenAI({ apiKey: envConfig.geminiApiKey });
      } catch (err: any) {
        console.warn('[BillOcrService] Could not initialize Gemini client:', err.message);
      }
    }
  }

  /**
   * Main entry point to extract structured invoice data from an uploaded bill (image or PDF).
   */
  public async extractBillData(
    fileBuffer: Buffer,
    mimeType: string,
    fileName = 'bill'
  ): Promise<ExtractedBillData> {
    const warnings: string[] = [];
    let rawBill: RawExtractedBill | null = null;
    let aiProviderUsed = 'none';
    let confidence: 'high' | 'medium' | 'low' = 'low';

    const normalizedMime = this.normalizeMimeType(mimeType, fileName);
    const isSampleRequest = fileName.toLowerCase().includes('sample');

    // 1. Explicit Sample Bill request for zero-config demonstration
    if (isSampleRequest) {
      rawBill = this.extractWithRuleBasedParser(fileBuffer, fileName);
      aiProviderUsed = 'sample-demo-bill';
      confidence = 'medium';
      warnings.push('Displaying verified sample bill dataset for testing and review.');
    } else {
      // 2. Real bill upload: Use Gemini Vision (gemini-3.8-flash)
      if (envConfig.geminiApiKey) {
        try {
          rawBill = await this.extractWithGemini(fileBuffer, normalizedMime);
          aiProviderUsed = 'gemini-3.8-flash';
          confidence = 'high';
        } catch (err: any) {
          console.error('[BillOcrService] Gemini extraction failed:', err.message);
          throw new Error(formatGeminiErrorMessage(err));
        }
      } else if (envConfig.openaiApiKey) {
        // Fallback to OpenAI Vision if Gemini is not configured
        try {
          rawBill = await this.extractWithOpenAI(fileBuffer, normalizedMime);
          aiProviderUsed = 'openai-gpt-4o-mini';
          confidence = 'high';
        } catch (err: any) {
          console.error('[BillOcrService] OpenAI extraction failed:', err.message);
          throw new Error(`OpenAI AI extraction failed: ${err.message}`);
        }
      } else {
        throw new Error(
          'No AI Vision provider is configured. Please add GEMINI_API_KEY to backend/.env to scan live purchase bills, or click "Try Sample Purchase Bill" for demonstration.'
        );
      }
    }

    // 4. Enrich & Match items against Supabase / Store medicines and suppliers
    const [existingMedicines, existingSuppliers] = await Promise.all([
      pharmacyStore.getAllMedicines().catch(() => [] as MedicineWithBatches[]),
      pharmacyStore.getAllSuppliers().catch(() => [] as Supplier[]),
    ]);

    const matchedSupplier = this.matchSupplier(rawBill.supplierName, existingSuppliers);

    const enrichedItems: ExtractedBillItem[] = (rawBill.items || []).map((item, index) => {
      const match = this.matchMedicine(item.name, existingMedicines);
      const missingFields: string[] = [];

      const cleanBatch = item.batchNumber ? item.batchNumber.trim().toUpperCase() : null;
      const cleanExpiry = this.normalizeDate(item.expiryDate);
      const cleanMfg = this.normalizeDate(item.mfgDate);
      const qty = item.quantity && Number(item.quantity) > 0 ? Math.round(Number(item.quantity)) : null;
      const price = item.purchasePrice !== undefined && item.purchasePrice !== null ? Number(item.purchasePrice) : null;
      const selling = item.sellingPrice !== undefined && item.sellingPrice !== null
        ? Number(item.sellingPrice)
        : match
        ? match.sellingPrice
        : price
        ? Math.round(price * 1.3 * 100) / 100
        : null;

      if (!cleanBatch) missingFields.push('batchNumber');
      if (!cleanExpiry) missingFields.push('expiryDate');
      if (!qty) missingFields.push('quantity');
      if (price === null) missingFields.push('purchasePrice');

      let itemConfidence: 'high' | 'medium' | 'low' = 'high';
      if (missingFields.length >= 2) itemConfidence = 'low';
      else if (missingFields.length === 1) itemConfidence = 'medium';

      return {
        id: `extracted-item-${index + 1}-${Date.now()}`,
        rawName: item.name || 'Unnamed Medicine',
        matchedMedicineId: match ? match.id : null,
        matchedMedicineName: match ? match.name : null,
        batchNumber: cleanBatch,
        quantity: qty,
        purchasePrice: price,
        sellingPrice: selling,
        mfgDate: cleanMfg,
        expiryDate: cleanExpiry,
        category: match ? match.category : item.category || this.inferCategory(item.name),
        unit: match ? match.unit : item.unit || 'tablets',
        confidence: itemConfidence,
        missingFields,
      };
    });

    // Compute or verify total amount
    const computedTotal = enrichedItems.reduce(
      (sum, it) => sum + (it.quantity || 0) * (it.purchasePrice || 0),
      0
    );
    const finalTotal = rawBill.totalAmount ? Number(rawBill.totalAmount) : Math.round(computedTotal * 100) / 100;

    return {
      supplierName: rawBill.supplierName || (matchedSupplier ? matchedSupplier.name : null),
      matchedSupplierId: matchedSupplier ? matchedSupplier.id : null,
      invoiceNumber: rawBill.invoiceNumber || null,
      invoiceDate: this.normalizeDate(rawBill.invoiceDate),
      totalAmount: finalTotal,
      items: enrichedItems,
      aiProviderUsed,
      confidence,
      warnings,
    };
  }

  /**
   * Google Gemini Vision document extraction
   */
  private async extractWithGemini(fileBuffer: Buffer, mimeType: string): Promise<RawExtractedBill> {
    const ai = this.geminiClient || new GoogleGenAI({ apiKey: envConfig.geminiApiKey! });
    const base64Data = fileBuffer.toString('base64');

    const prompt = `You are an expert pharmaceutical document AI for pharmacy inventory management.
Carefully examine this medicine purchase bill / tax invoice / stock delivery receipt.
Extract the following information in strict, valid JSON format only (no markdown quotes, no explanations):

{
  "supplierName": "Full name of the pharmaceutical distributor, wholesaler, or manufacturer",
  "invoiceNumber": "Exact invoice / bill / challan number",
  "invoiceDate": "YYYY-MM-DD or null if not found",
  "totalAmount": 1234.56,
  "items": [
    {
      "name": "Full brand name and dosage strength, e.g. Paracetamol 500mg Tablets",
      "genericName": "Generic active ingredient if mentioned, e.g. Paracetamol",
      "category": "One of: Analgesics, Antibiotics, Antidiabetics, Antihistamines, Cardiovascular, Gastrointestinal, Respiratory, Vitamins, General",
      "unit": "One of: tablets, capsules, bottles, strips, tubes, vials",
      "batchNumber": "Exact batch / lot number, or null if NOT present",
      "quantity": 50,
      "purchasePrice": 12.50,
      "sellingPrice": 18.00,
      "mfgDate": "YYYY-MM-DD or null if absent",
      "expiryDate": "YYYY-MM-DD or null if absent"
    }
  ]
}

CRITICAL PHARMACEUTICAL RULES:
1. NEVER invent, hallucinate, or guess batch numbers or expiry dates. If absent or illegible on the invoice, return null.
2. For dates formatted as MM/YY (e.g. 08/26 or Aug-26), convert to the last day of that month: "2026-08-31".
3. Extract ALL medicine rows from the invoice table.
4. Ensure quantity is a positive integer representing total units received.
5. purchasePrice is the cost per unit to the pharmacy before or after tax.
6. Return ONLY the JSON object.`;

    // Delays for 3 automatic retries with exponential backoff: 2s, 4s, and 8s
    const retryDelaysMs = [2000, 4000, 8000];
    let lastError: any = null;

    // Up to 1 initial attempt + 3 retries = 4 total attempts
    for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: base64Data,
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
          config: {
            responseMimeType: 'application/json',
          },
        });

        const text = response.text || '';
        const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
      } catch (err: any) {
        lastError = err;

        // Permanent errors (invalid key, bad model): Do NOT retry!
        if (isPermanentGeminiError(err)) {
          console.error(`[BillOcrService] Permanent Gemini error encountered (${err.message}). Aborting retries.`);
          throw err;
        }

        // Transient errors (503, 429, timeout): Retry with exponential backoff
        if (isTransientGeminiError(err) && attempt < retryDelaysMs.length) {
          const delay = retryDelaysMs[attempt];
          console.warn(
            `[BillOcrService] Gemini returned temporary demand/rate-limit error. Retrying in ${delay / 1000}s (retry ${attempt + 1}/${retryDelaysMs.length})...`
          );
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        // If not transient or retries exhausted, throw
        throw err;
      }
    }

    throw lastError || new Error('Gemini extraction failed after retries.');
  }

  /**
   * OpenAI Vision fallback
   */
  private async extractWithOpenAI(fileBuffer: Buffer, mimeType: string): Promise<RawExtractedBill> {
    const base64Data = fileBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${envConfig.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are a pharmacy invoice parser. Extract supplierName, invoiceNumber, invoiceDate (YYYY-MM-DD), totalAmount, and items array with name, genericName, category, unit, batchNumber, quantity, purchasePrice, sellingPrice, mfgDate, expiryDate. Never invent batch numbers or expiry dates; return null if absent. Respond ONLY with valid JSON.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract the pharmaceutical purchase bill data into JSON format.',
              },
              {
                type: 'image_url',
                image_url: { url: dataUrl },
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API responded with status ${res.status}: ${errText}`);
    }

    const result = (await res.json()) as any;
    const content = result.choices?.[0]?.message?.content || '{}';
    return JSON.parse(content);
  }

  /**
   * Intelligent Rule-based / Sample Bill fallback parser
   * Parses text content or provides structured sample data if an invoice is being tested
   */
  private extractWithRuleBasedParser(fileBuffer: Buffer, fileName: string): RawExtractedBill {
    const textContent = fileBuffer.toString('utf-8');

    // Check if uploaded text file contains formatted invoice lines
    if (textContent.includes('INVOICE') || textContent.includes('Bill') || textContent.includes('Supplier')) {
      const parsed = this.parseRawInvoiceText(textContent);
      if (parsed.items.length > 0) return parsed;
    }

    // Default realistic sample purchase bill for immediate zero-config testing
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
   * Matches an extracted medicine name to the existing catalog.
   */
  public matchMedicine(
    rawName: string,
    existingMedicines: MedicineWithBatches[]
  ): MedicineWithBatches | null {
    if (!rawName || existingMedicines.length === 0) return null;

    const cleanRaw = this.normalizeMedicineName(rawName);

    // 1. Exact match
    const exact = existingMedicines.find(
      (m) => this.normalizeMedicineName(m.name) === cleanRaw
    );
    if (exact) return exact;

    // 2. Starts with / contains match
    const subMatch = existingMedicines.find((m) => {
      const cleanM = this.normalizeMedicineName(m.name);
      return cleanM.includes(cleanRaw) || cleanRaw.includes(cleanM);
    });
    if (subMatch) return subMatch;

    // 3. Generic name match
    const genericMatch = existingMedicines.find((m) => {
      if (!m.genericName) return false;
      const cleanG = this.normalizeMedicineName(m.genericName);
      return cleanRaw.includes(cleanG);
    });
    if (genericMatch) return genericMatch;

    return null;
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
