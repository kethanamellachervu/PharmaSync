import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Plus,
  RefreshCw,
  PackageCheck,
  Check,
  Layers,
} from 'lucide-react';
import { apiService } from '../../services/api';
import {
  ExtractedBillData,
  ExtractedBillItem,
  ConfirmBillItemInput,
  ConfirmBillResult,
  Supplier,
  Medicine,
} from '../../types';

export type BillScanStage = 'UPLOAD' | 'SCANNING' | 'REVIEW' | 'CONFIRM' | 'SUCCESS';

interface BillScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: ConfirmBillResult) => void;
  suppliers: Supplier[];
  medicines?: Medicine[];
}

export const BillScanModal: React.FC<BillScanModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  suppliers,
}) => {
  const [stage, setStage] = useState<BillScanStage>('UPLOAD');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scanning progress state
  const [scanStepIndex, setScanStepIndex] = useState(0);
  const [scanElapsedSeconds, setScanElapsedSeconds] = useState(0);

  // Extracted Bill form state
  const [supplierName, setSupplierName] = useState('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [billNotes, setBillNotes] = useState('');
  const [items, setItems] = useState<ExtractedBillItem[]>([]);
  const [serverWarnings, setServerWarnings] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveResult, setSaveResult] = useState<ConfirmBillResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (filePreviewUrl && filePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  // Validation checks for Review stage (Unconditional hook)
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!invoiceNumber.trim()) errors.push('Invoice / Bill number is required.');
    if (!supplierName.trim()) errors.push('Supplier name is required.');
    if (items.length === 0) errors.push('At least one medicine item is required.');

    items.forEach((item, idx) => {
      const prefix = `Item #${idx + 1} (${item.rawName || 'Unnamed'})`;
      if (!item.rawName.trim()) errors.push(`${prefix}: Medicine name is required.`);
      if (!item.batchNumber?.trim()) errors.push(`${prefix}: Batch number is missing.`);
      if (!item.quantity || Number(item.quantity) <= 0) errors.push(`${prefix}: Quantity must be > 0.`);
      if (item.purchasePrice === null || isNaN(Number(item.purchasePrice)) || Number(item.purchasePrice) < 0) {
        errors.push(`${prefix}: Purchase price must be >= 0.`);
      }
      if (!item.expiryDate || !/^\d{4}-\d{2}-\d{2}$/.test(item.expiryDate)) {
        errors.push(`${prefix}: Expiry date must be valid (YYYY-MM-DD).`);
      } else {
        const todayStr = new Date().toISOString().split('T')[0];
        if (item.expiryDate < todayStr) {
          errors.push(`${prefix}: Expiry date (${item.expiryDate}) is in the past.`);
        }
      }
    });

    return errors;
  }, [invoiceNumber, supplierName, items]);

  const totalCalculatedAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.purchasePrice) || 0), 0);
  }, [items]);

  const totalUnits = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  }, [items]);

  // File selection handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setSelectedFile(file);

    const pdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
    setIsPdf(pdf);

    if (!pdf) {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
    } else {
      setFilePreviewUrl(null);
    }
  };

  // Drag and drop handlers
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setErrorMessage(null);
      setSelectedFile(file);
      const pdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
      setIsPdf(pdf);
      if (!pdf) {
        setFilePreviewUrl(URL.createObjectURL(file));
      } else {
        setFilePreviewUrl(null);
      }
    }
  };


  // Trigger Bill Scan
  const handleStartScan = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a bill image or PDF to scan.');
      return;
    }

    setErrorMessage(null);
    setStage('SCANNING');
    setScanStepIndex(0);
    setScanElapsedSeconds(0);

    const elapsedTimer = setInterval(() => {
      setScanElapsedSeconds((prev) => prev + 1);
    }, 1000);

    const stepsTimer = setInterval(() => {
      setScanStepIndex((prev) => (prev < 3 ? prev + 1 : prev));
    }, 1200);

    try {
      const data: ExtractedBillData = await apiService.scanBill(selectedFile);
      clearInterval(stepsTimer);
      clearInterval(elapsedTimer);
      populateExtractedData(data);
      setStage('REVIEW');
    } catch (err: any) {
      clearInterval(stepsTimer);
      clearInterval(elapsedTimer);
      const isTimeout =
        err.message && (err.message.includes('timeout') || err.message.includes('timed out'));
      const errorMsg = isTimeout
        ? 'Scanning timed out. Gemini took longer than expected to process your document. Please verify your connection and click "Retry AI Scan".'
        : err.message || 'Bill scanning failed. Please review your file.';
      setErrorMessage(errorMsg);
      setStage('UPLOAD');
    }
  };

  const populateExtractedData = (data: ExtractedBillData) => {
    setSupplierName(data.supplierName || 'General Supplier');
    setSupplierId(data.matchedSupplierId || '');
    setInvoiceNumber(data.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`);
    setInvoiceDate(data.invoiceDate || new Date().toISOString().split('T')[0]);
    setItems(data.items || []);
    setServerWarnings(data.warnings || []);
  };

  // Item updates in Review stage
  const handleItemFieldChange = (
    index: number,
    field: keyof ExtractedBillItem,
    value: any
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      // Re-evaluate missing fields
      const missing: string[] = [];
      if (!item.batchNumber?.trim()) missing.push('batchNumber');
      if (!item.expiryDate?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(item.expiryDate)) {
        missing.push('expiryDate');
      }
      if (!item.quantity || Number(item.quantity) <= 0) missing.push('quantity');
      if (item.purchasePrice === null || item.purchasePrice === undefined || Number(item.purchasePrice) < 0) {
        missing.push('purchasePrice');
      }
      item.missingFields = missing;
      item.confidence = missing.length === 0 ? 'high' : missing.length === 1 ? 'medium' : 'low';

      updated[index] = item;
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddNewItem = () => {
    const nextDate = new Date();
    nextDate.setFullYear(nextDate.getFullYear() + 2);
    const defaultExpiry = nextDate.toISOString().split('T')[0];

    const newItem: ExtractedBillItem = {
      id: `manual-item-${Date.now()}`,
      rawName: '',
      matchedMedicineId: null,
      matchedMedicineName: null,
      batchNumber: `BATCH-${Date.now().toString().slice(-4)}`,
      quantity: 10,
      purchasePrice: 10,
      sellingPrice: 15,
      expiryDate: defaultExpiry,
      category: 'General',
      unit: 'tablets',
      confidence: 'medium',
      missingFields: ['rawName'],
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Proceed from Review to Confirm
  const handleProceedToConfirm = () => {
    if (validationErrors.length > 0) {
      setErrorMessage(validationErrors[0]);
      return;
    }
    setErrorMessage(null);
    setStage('CONFIRM');
  };

  // Execute Final Save to Supabase
  const handleConfirmAndSave = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payloadItems: ConfirmBillItemInput[] = items.map((it) => ({
        medicineId: it.matchedMedicineId || undefined,
        isNewMedicine: !it.matchedMedicineId,
        name: it.rawName.trim(),
        category: it.category || 'General',
        unit: it.unit || 'tablets',
        batchNumber: it.batchNumber!.trim().toUpperCase(),
        quantity: Math.round(Number(it.quantity)),
        purchasePrice: Number(it.purchasePrice),
        sellingPrice: Number(it.sellingPrice) || Math.round(Number(it.purchasePrice) * 1.3 * 100) / 100,
        mfgDate: it.mfgDate || undefined,
        expiryDate: it.expiryDate!,
      }));

      const payload = {
        supplierId: supplierId || undefined,
        supplierName: supplierName.trim(),
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate: invoiceDate || undefined,
        notes: billNotes.trim() || undefined,
        items: payloadItems,
      };

      const result = await apiService.confirmBill(payload);
      setSaveResult(result);
      setStage('SUCCESS');
      onSuccess(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save bill to Supabase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset & start new scan
  const handleReset = () => {
    setStage('UPLOAD');
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setIsPdf(false);
    setItems([]);
    setErrorMessage(null);
    setSaveResult(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-md shadow-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Add Purchase Bill
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload a photo or PDF of your supplier bill.
              </p>
            </div>
          </div>

          {/* STAGES PROGRESS STEPPER */}
          <div className="hidden md:flex items-center gap-2">
            {[
              { id: 'UPLOAD', label: 'Upload' },
              { id: 'SCANNING', label: 'Scan' },
              { id: 'REVIEW', label: 'Review & Edit' },
              { id: 'CONFIRM', label: 'Confirm' },
              { id: 'SUCCESS', label: 'Done' },
            ].map((step, idx, arr) => {
              const stagesOrder: BillScanStage[] = ['UPLOAD', 'SCANNING', 'REVIEW', 'CONFIRM', 'SUCCESS'];
              const currentIdx = stagesOrder.indexOf(stage);
              const isPast = currentIdx > idx;
              const isCurrent = stage === step.id;

              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      isCurrent
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : isPast
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isPast ? <Check className="w-3.5 h-3.5" /> : <span>{idx + 1}</span>}
                    <span>{step.label}</span>
                  </div>
                  {idx < arr.length - 1 && (
                    <div
                      className={`w-4 h-0.5 mx-1 transition-all ${
                        currentIdx > idx ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ERROR NOTIFICATION BANNER */}
        {errorMessage && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-6 py-3 bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 text-xs">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{errorMessage}</p>
                {selectedFile && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                    Your file <strong>{selectedFile.name}</strong> remains selected. You can retry immediately.
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              {selectedFile && stage === 'UPLOAD' && (
                <button
                  type="button"
                  onClick={handleStartScan}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-md shadow-xs transition"
                >
                  Retry Now
                </button>
              )}
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-1 text-[11px]"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* STAGE 1: UPLOAD */}
        {stage === 'UPLOAD' && (
          <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col items-center">
            <div className="w-full max-w-2xl mb-5 flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  Upload supplier invoice photo or PDF document
                </span>
              </div>
            </div>

            {/* Dropzone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full max-w-2xl p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center text-center ${
                selectedFile
                  ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                  : 'border-slate-300 dark:border-slate-700 hover:border-emerald-400 bg-slate-50/50 dark:bg-slate-800/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />

              {filePreviewUrl ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="relative group max-h-56 overflow-hidden rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
                    <img
                      src={filePreviewUrl}
                      alt="Bill preview"
                      className="max-h-56 object-contain rounded-xl"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-medium transition">
                      Click to choose different image
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {selectedFile?.name} ({(selectedFile!.size / (1024 * 1024)).toFixed(2)} MB)
                  </p>
                </div>
              ) : isPdf && selectedFile ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="p-4 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shadow-sm">
                    <FileText className="w-10 h-10" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      PDF Document • {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-6">
                  <div className="p-4 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shadow-sm">
                    <UploadCloud className="w-10 h-10" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Drag & drop your purchase bill here, or browse
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Supports JPG, PNG, WEBP, or PDF invoices (up to 15MB)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={handleStartScan}
                disabled={!selectedFile}
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-md transition ${
                  selectedFile
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/25'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                {errorMessage && selectedFile ? 'Retry AI Scan' : 'Start AI Scan'}
              </button>
            </div>
          </div>
        )}

        {/* STAGE 2: SCANNING PROGRESS */}
        {stage === 'SCANNING' && (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 animate-pulse">
                <Sparkles className="w-10 h-10 animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Analyzing Purchase Bill with Gemini AI...
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-4">
              Extracting supplier details, invoice metadata, medicine lines, batch numbers, and expiry dates
            </p>

            {/* Live elapsed time badge & Retry status */}
            <div className="flex flex-col items-center gap-1.5 mb-4">
              <div
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                  scanElapsedSeconds >= 14
                    ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 animate-spin ${
                    scanElapsedSeconds >= 14 ? 'text-amber-600' : 'text-emerald-600'
                  }`}
                />
                <span>
                  Elapsed: {scanElapsedSeconds}s •{' '}
                  {scanElapsedSeconds >= 24
                    ? 'Exponential backoff active (retrying Google Gemini)...'
                    : scanElapsedSeconds >= 14
                    ? 'High server demand detected — retrying automatically...'
                    : 'Gemini 3.8 Flash Vision processing (typically 8–25s)'}
                </span>
              </div>
              {scanElapsedSeconds >= 14 && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center max-w-sm">
                  Google servers are busy. Automatic retry with exponential backoff (2s, 4s, 8s) is running to prevent dropped uploads.
                </p>
              )}
            </div>

            {/* Smooth visual progress bar */}
            <div className="w-full max-w-md h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-5">
              <div
                className={`h-full transition-all duration-500 ${
                  scanElapsedSeconds >= 14
                    ? 'bg-gradient-to-r from-amber-500 to-emerald-500'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                }`}
                style={{
                  width: `${Math.min(94, Math.max(12, scanElapsedSeconds * 3.5 + 15))}%`,
                }}
              />
            </div>

            <div className="w-full max-w-md space-y-2.5 text-left">
              {[
                'Extracting image layout & invoice header...',
                'Parsing medicine lines, batch numbers & quantities...',
                'Validating expiry dates and pricing against FEFO rules...',
                'Cross-referencing existing Supabase catalog...',
              ].map((step, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 text-xs p-2.5 rounded-lg transition-all ${
                    scanStepIndex >= idx
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-medium'
                      : 'text-slate-400'
                  }`}
                >
                  {scanStepIndex > idx ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : scanStepIndex === idx ? (
                    <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 shrink-0" />
                  )}
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STAGE 3: REVIEW & CORRECTION */}
        {stage === 'REVIEW' && (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Please check the details before saving.
              </span>
            </div>

            {/* Warning Banner if fields are missing */}
            {serverWarnings.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  {serverWarnings.map((w, i) => (
                    <p key={i}>{w}</p>
                  ))}
                </div>
              </div>
            )}

            {/* INVOICE HEADER DETAILS */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Supplier / Vendor Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={supplierName}
                    onChange={(e) => {
                      setSupplierName(e.target.value);
                      const matched = suppliers.find(
                        (s) => s.name.toLowerCase() === e.target.value.trim().toLowerCase()
                      );
                      setSupplierId(matched ? matched.id : '');
                    }}
                    placeholder="e.g. Apex Pharma Wholesale"
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  {supplierId && (
                    <span className="absolute right-2 top-2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                      Matched
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Invoice / Bill Number *
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. INV-2024-889"
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Bill Summary
                </label>
                <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-slate-600 dark:text-slate-300 text-[11px]">
                    {items.length} lines • {totalUnits} units
                  </span>
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                    ₹{totalCalculatedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* EXTRACTED ITEMS TABLE */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  Extracted Medicine Batches ({items.length})
                </h3>
                <button
                  type="button"
                  onClick={handleAddNewItem}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Medicine Line
                </button>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <th className="p-3 w-10 text-center">#</th>
                      <th className="p-3 min-w-[220px]">Medicine Name</th>
                      <th className="p-3 min-w-[130px]">Category</th>
                      <th className="p-3 min-w-[120px]">Batch No. *</th>
                      <th className="p-3 w-24">Qty *</th>
                      <th className="p-3 w-28">Buy Price (₹) *</th>
                      <th className="p-3 w-28">Sell Price (₹)</th>
                      <th className="p-3 min-w-[140px]">Expiry (YYYY-MM-DD) *</th>
                      <th className="p-3 w-24 text-right">Subtotal</th>
                      <th className="p-3 w-12 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {items.map((item, idx) => {
                      const isMatched = Boolean(item.matchedMedicineId);
                      const hasMissingBatch = item.missingFields.includes('batchNumber');
                      const hasMissingExpiry = item.missingFields.includes('expiryDate');

                      return (
                        <tr
                          key={item.id || idx}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                        >
                          <td className="p-3 text-center text-slate-400 font-medium">
                            {idx + 1}
                          </td>

                          {/* Medicine Name */}
                          <td className="p-3">
                            <input
                              type="text"
                              value={item.rawName}
                              onChange={(e) => handleItemFieldChange(idx, 'rawName', e.target.value)}
                              placeholder="Medicine brand & strength"
                              className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            />
                            <div className="mt-1 flex items-center gap-1.5">
                              {isMatched ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                                  <Check className="w-3 h-3" /> Matched: {item.matchedMedicineName}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded">
                                  <Plus className="w-3 h-3" /> Will create new medicine
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Category */}
                          <td className="p-3">
                            <select
                              value={item.category || 'General'}
                              onChange={(e) => handleItemFieldChange(idx, 'category', e.target.value)}
                              className="w-full px-2 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none"
                            >
                              {[
                                'General',
                                'Antibiotics',
                                'Analgesics',
                                'Antidiabetics',
                                'Antihistamines',
                                'Cardiovascular',
                                'Gastrointestinal',
                                'Respiratory',
                                'Vitamins',
                              ].map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Batch Number */}
                          <td className="p-3">
                            <input
                              type="text"
                              value={item.batchNumber || ''}
                              onChange={(e) =>
                                handleItemFieldChange(idx, 'batchNumber', e.target.value.toUpperCase())
                              }
                              placeholder="e.g. B-102"
                              className={`w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border font-mono font-medium focus:outline-none ${
                                hasMissingBatch
                                  ? 'border-amber-400 bg-amber-50/30 dark:bg-amber-950/20 text-amber-900 dark:text-amber-100'
                                  : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                              }`}
                            />
                            {hasMissingBatch && (
                              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                                <AlertTriangle className="w-3 h-3" /> Please enter batch
                              </span>
                            )}
                          </td>

                          {/* Quantity */}
                          <td className="p-3">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity ?? ''}
                              onChange={(e) =>
                                handleItemFieldChange(idx, 'quantity', parseInt(e.target.value, 10) || 0)
                              }
                              className="w-full px-2 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-slate-100 text-center focus:outline-none"
                            />
                          </td>

                          {/* Purchase Price */}
                          <td className="p-3">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.purchasePrice ?? ''}
                              onChange={(e) =>
                                handleItemFieldChange(idx, 'purchasePrice', parseFloat(e.target.value) || 0)
                              }
                              className="w-full px-2 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-slate-100 text-right focus:outline-none"
                            />
                          </td>

                          {/* Selling Price */}
                          <td className="p-3">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.sellingPrice ?? ''}
                              onChange={(e) =>
                                handleItemFieldChange(idx, 'sellingPrice', parseFloat(e.target.value) || 0)
                              }
                              className="w-full px-2 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-right focus:outline-none"
                            />
                          </td>

                          {/* Expiry Date */}
                          <td className="p-3">
                            <input
                              type="date"
                              value={item.expiryDate || ''}
                              onChange={(e) => handleItemFieldChange(idx, 'expiryDate', e.target.value)}
                              className={`w-full px-2 py-1.5 rounded bg-white dark:bg-slate-900 border font-medium focus:outline-none ${
                                hasMissingExpiry
                                  ? 'border-amber-400 bg-amber-50/30 text-amber-900 dark:text-amber-100'
                                  : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                              }`}
                            />
                            {hasMissingExpiry && (
                              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                                <AlertTriangle className="w-3 h-3" /> Expiry required
                              </span>
                            )}
                          </td>

                          {/* Line Subtotal */}
                          <td className="p-3 text-right font-bold text-slate-800 dark:text-slate-100">
                            ₹{((Number(item.quantity) || 0) * (Number(item.purchasePrice) || 0)).toFixed(2)}
                          </td>

                          {/* Remove button */}
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Scan Different Bill
              </button>

              <button
                type="button"
                onClick={handleProceedToConfirm}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-500/25 flex items-center gap-2 transition"
              >
                Proceed to Confirmation
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STAGE 4: CONFIRMATION SUMMARY */}
        {stage === 'CONFIRM' && (
          <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col gap-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Confirm Purchase Bill Intake
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Please review the finalized data before committing stock batches to Supabase PostgreSQL.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold text-slate-500 block">Supplier</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{supplierName}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold text-slate-500 block">Invoice Number</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{invoiceNumber}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold text-slate-500 block">Total Units Inward</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{totalUnits} units</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-semibold text-slate-500 block">Total Bill Value</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  ₹{totalCalculatedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
              <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2.5 font-bold text-slate-700 dark:text-slate-200 flex justify-between">
                <span>Items to be added to inventory ({items.length})</span>
                <span>FEFO Expiry Order Enforced</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
                {items.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">
                        {item.rawName}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Batch: <span className="font-mono font-medium">{item.batchNumber}</span> • Expiry:{' '}
                        {item.expiryDate} • Category: {item.category}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900 dark:text-white">
                        {item.quantity} {item.unit || 'units'} @ ₹{item.purchasePrice}
                      </p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        ₹{((Number(item.quantity) || 0) * (Number(item.purchasePrice) || 0)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Optional Notes */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Internal Remarks / Notes (Optional)
              </label>
              <textarea
                value={billNotes}
                onChange={(e) => setBillNotes(e.target.value)}
                placeholder="Add any delivery notes, discount mentions, or verification comments..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setStage('REVIEW')}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Edit
              </button>

              <button
                type="button"
                onClick={handleConfirmAndSave}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-500/25 flex items-center gap-2 transition disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Committing to Supabase...
                  </>
                ) : (
                  <>
                    <PackageCheck className="w-4 h-4" />
                    Confirm & Update Stock
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STAGE 5: SUCCESS RECEIPT */}
        {stage === 'SUCCESS' && saveResult && (
          <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
              Inventory Updated Successfully!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-6">
              Purchase Order <span className="font-semibold text-slate-800 dark:text-slate-200">{saveResult.purchase.purchaseNumber}</span> recorded in Supabase. Stock movements audit trail has been logged.
            </p>

            <div className="w-full max-w-xl p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-left text-xs space-y-4 mb-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-slate-500">Supplier:</span>{' '}
                  <span className="font-bold text-slate-900 dark:text-white">{saveResult.purchase.supplierName}</span>
                </div>
                <div>
                  <span className="text-slate-500">Total Value:</span>{' '}
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{saveResult.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Recorded Batches ({saveResult.batchesCreated.length}):
                </p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {saveResult.purchase.items.map((it, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {it.medicineName}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Batch: <span className="font-mono">{it.batchNumber}</span> • Exp: {it.expiryDate}
                        </p>
                      </div>
                      <span className="px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                        +{it.quantity} units
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {saveResult.newMedicinesCreated.length > 0 && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 font-medium">New catalog medicines registered: </span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {saveResult.newMedicinesCreated.map((m) => m.name).join(', ')}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Scan Another Bill
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-500/25 transition"
              >
                Done / Return to Purchases
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
