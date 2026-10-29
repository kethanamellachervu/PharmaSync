export interface ScanProgressState {
  scanId: string;
  stepIndex: number; // 0: Prep/Raster, 1: PaddleOCR, 2: Parser, 3: Catalog Validation, 4: Done
  stepName: string;
  status: 'processing' | 'completed' | 'error';
  message: string;
  medicinesExtracted?: number;
  totalTimeMs?: number;
  error?: string;
  updatedAt: number;
}

const STEP_NAMES = [
  'Document preparation & PDF page rasterization...',
  'Detecting text & bounding boxes with PaddleOCR...',
  'Deterministic invoice parser & batch/expiry extraction...',
  'Validating medicines against pharmacy catalog & database...',
  'Validation complete',
];

class ScanProgressService {
  private progressMap = new Map<string, ScanProgressState>();

  public initProgress(scanId: string, initialMessage = 'Initializing document scan pipeline...'): void {
    this.progressMap.set(scanId, {
      scanId,
      stepIndex: 0,
      stepName: STEP_NAMES[0],
      status: 'processing',
      message: initialMessage,
      updatedAt: Date.now(),
    });
  }

  public setStep(
    scanId: string,
    stepIndex: number,
    customMessage?: string,
    extra?: Partial<ScanProgressState>
  ): void {
    const existing = this.progressMap.get(scanId) || {
      scanId,
      stepIndex: 0,
      stepName: STEP_NAMES[0],
      status: 'processing' as const,
      message: '',
      updatedAt: Date.now(),
    };

    const validStep = Math.min(Math.max(0, stepIndex), 4);
    this.progressMap.set(scanId, {
      ...existing,
      stepIndex: validStep,
      stepName: STEP_NAMES[validStep] || existing.stepName,
      message: customMessage || STEP_NAMES[validStep] || existing.message,
      status: validStep >= 4 ? 'completed' : 'processing',
      updatedAt: Date.now(),
      ...extra,
    });
  }

  public setError(scanId: string, errorMessage: string): void {
    const existing = this.progressMap.get(scanId);
    this.progressMap.set(scanId, {
      scanId,
      stepIndex: existing ? existing.stepIndex : 0,
      stepName: existing ? existing.stepName : STEP_NAMES[0],
      status: 'error',
      message: errorMessage,
      error: errorMessage,
      updatedAt: Date.now(),
    });
  }

  public getProgress(scanId: string): ScanProgressState | null {
    const state = this.progressMap.get(scanId);
    if (!state) return null;
    return { ...state };
  }

  public cleanup(scanId: string): void {
    // Keep completed/error state in memory for 5 minutes for UI polling queries, then cleanup
    setTimeout(() => {
      this.progressMap.delete(scanId);
    }, 5 * 60 * 1000);
  }
}

export const scanProgressService = new ScanProgressService();
